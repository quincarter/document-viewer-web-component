// src/components/tiff/workers/tiff.worker.ts

import TiffLib from "tiff.js";

/**
 * Interface for the tiff.js library instance
 */
interface TiffInstance {
	width(): number;
	height(): number;
	currentDirectory(): number;
	countDirectory(): number;
	setDirectory(index: number): boolean;
	getField(tag: number): number;
	readRGBAImage(): ArrayBuffer;
	close(): void;
}

/**
 * Interface for the Tiff constructor
 */
interface TiffStatic {
	new (params: { buffer: ArrayBuffer }): TiffInstance;
	initialize(options: { TOTAL_MEMORY: number }): void;
}

interface TiffLibContainer {
	default?: TiffStatic;
	Tiff?: TiffStatic;
}

// Handle different module formats (CJS/UMD/ESM)
let Tiff: TiffStatic | undefined;
const lib = TiffLib as unknown as TiffStatic | TiffLibContainer;

if (typeof lib === "function") {
	Tiff = lib;
} else if (lib && "default" in lib && typeof lib.default === "function") {
	Tiff = lib.default;
} else if (lib && "Tiff" in lib && typeof lib.Tiff === "function") {
	Tiff = lib.Tiff;
} else if (
	"Tiff" in self &&
	typeof (self as unknown as { Tiff: TiffStatic }).Tiff === "function"
) {
	Tiff = (self as unknown as { Tiff: TiffStatic }).Tiff;
}

if (!Tiff) {
	console.error(
		"TIFF Worker: Tiff library not found in any expected location.",
		{
			TiffLib,
			selfTiff: (self as unknown as { Tiff?: unknown }).Tiff,
		},
	);
}

interface WorkerPayload {
	tiffBuffer?: ArrayBuffer;
	documentId?: string;
	pageNumber?: number;
	scale?: number;
	fitMode?: "page";
	containerWidth?: number;
	containerHeight?: number;
	bitmap?: ImageBitmap;
	width?: number;
	height?: number;
	canvas?: OffscreenCanvas;
}

interface WorkerInput {
	type: string;
	payload: WorkerPayload;
	messageId: number;
}

interface WorkerResponse {
	type: string;
	success: boolean;
	messageId: number;
	documentId?: string | null;
	pageCount?: number;
	pageNumber?: number;
	width?: number;
	height?: number;
	scale?: number;
	bitmap?: ImageBitmap;
	error?: {
		message: string;
	};
}

// Helper to type self in worker context
const ctx: Worker = self as unknown as Worker;

let currentTiff: TiffInstance | null = null;
let currentDocumentId: string | null = null;
let totalPages = 0;
let currentPageNumber = 0;
let currentScale = 1.0;
let offscreenCanvas: OffscreenCanvas | null = null;
let offscreenContext: OffscreenCanvasRenderingContext2D | null = null;

async function initTiff() {
	if (Tiff && typeof Tiff.initialize === "function") {
		Tiff.initialize({ TOTAL_MEMORY: 16777216 * 16 });
	}
}

async function renderPageInternal(
	pageNumber: number,
	scale: number,
	messageId: number,
) {
	if (!currentTiff) {
		throw new Error("No TIFF document loaded.");
	}

	try {
		currentPageNumber = pageNumber;
		currentScale = scale;

		currentTiff.setDirectory(pageNumber);
		const width = currentTiff.width();
		const height = currentTiff.height();

		// readRGBAImage returns a ArrayBuffer containing RGBA data
		const rgbaData = currentTiff.readRGBAImage();

		const targetWidth = Math.floor(width * scale);
		const targetHeight = Math.floor(height * scale);

		if (offscreenCanvas && offscreenContext) {
			offscreenCanvas.width = targetWidth;
			offscreenCanvas.height = targetHeight;

			const imageData = new ImageData(
				new Uint8ClampedArray(rgbaData),
				width,
				height,
			);

			if (scale === 1.0) {
				offscreenContext.putImageData(imageData, 0, 0);
			} else {
				const tempCanvas = new OffscreenCanvas(width, height);
				const tempCtx = tempCanvas.getContext("2d");
				if (tempCtx) {
					tempCtx.putImageData(imageData, 0, 0);
					offscreenContext.drawImage(
						tempCanvas,
						0,
						0,
						width,
						height,
						0,
						0,
						targetWidth,
						targetHeight,
					);
				}
			}
		}

		ctx.postMessage({
			type: "pageRendered",
			success: true,
			messageId,
			documentId: currentDocumentId,
			pageNumber,
			width: targetWidth,
			height: targetHeight,
			scale,
		} satisfies WorkerResponse);
	} catch (error) {
		console.error("Error rendering TIFF page:", error);
		ctx.postMessage({
			type: "pageRendered",
			success: false,
			messageId,
			error: {
				message: error instanceof Error ? error.message : "Unknown error",
			},
		} satisfies WorkerResponse);
	}
}

ctx.onmessage = async (event: MessageEvent<WorkerInput>) => {
	const { type, payload, messageId } = event.data;

	try {
		switch (type) {
			case "init":
				await initTiff();
				ctx.postMessage({
					type: "libraryInitialized",
					success: true,
					messageId,
				} satisfies WorkerResponse);
				break;

			case "initCanvas":
				if (!payload || !payload.canvas) {
					throw new Error("Canvas not provided for initCanvas.");
				}
				offscreenCanvas = payload.canvas;
				offscreenContext = offscreenCanvas?.getContext(
					"2d",
				) as OffscreenCanvasRenderingContext2D | null;
				break;

			case "loadTiff": {
				await initTiff();
				if (!payload || !payload.tiffBuffer || !Tiff) {
					throw new Error("TIFF buffer and library are required.");
				}

				if (currentTiff) {
					currentTiff.close();
				}

				currentTiff = new Tiff({ buffer: payload.tiffBuffer });
				currentDocumentId = payload.documentId || `tiff-doc-${Date.now()}`;

				totalPages = currentTiff.countDirectory();
				currentPageNumber = 0;
				currentScale = 1.0;
				currentTiff.setDirectory(0);

				ctx.postMessage({
					type: "tiffLoaded",
					documentId: currentDocumentId,
					pageCount: totalPages,
					success: true,
					messageId,
				} satisfies WorkerResponse);
				break;
			}

			case "renderPage": {
				const { pageNumber, scale, fitMode, containerWidth, containerHeight } =
					payload;
				if (pageNumber === undefined) throw new Error("pageNumber required");

				let targetScale = scale || currentScale;
				if (fitMode === "page" && containerWidth && containerHeight && currentTiff) {
					currentTiff.setDirectory(pageNumber);
					const originalWidth = currentTiff.width();
					const originalHeight = currentTiff.height();
					const scaleWidth = containerWidth / originalWidth;
					const scaleHeight = containerHeight / originalHeight;
					targetScale = Math.max(
						0.5,
						Math.min(3, Math.min(scaleWidth, scaleHeight)),
					);
				}

				await renderPageInternal(pageNumber, targetScale, messageId);
				break;
			}

			case "renderToBitmap": {
				const { pageNumber, scale } = payload;
				if (
					pageNumber === undefined ||
					scale === undefined ||
					!currentTiff ||
					!Tiff
				)
					throw new Error("Invalid state for renderToBitmap");

				currentTiff.setDirectory(pageNumber);
				const width = currentTiff.width();
				const height = currentTiff.height();
				const rgbaData = currentTiff.readRGBAImage();

				const imageData = new ImageData(
					new Uint8ClampedArray(rgbaData),
					width,
					height,
				);
				const bitmap = await createImageBitmap(imageData);

				ctx.postMessage(
					{
						type: "pageToBitmap",
						success: true,
						messageId,
						pageNumber,
						scale,
						bitmap,
						width,
						height,
					} satisfies WorkerResponse,
					[bitmap],
				);
				break;
			}

			case "drawBitmap": {
				if (!offscreenCanvas || !offscreenContext)
					throw new Error("Canvas not initialized");
				const { bitmap, width, height, pageNumber, scale } = payload;
				if (!bitmap || width === undefined || height === undefined)
					throw new Error("Invalid payload");

				offscreenCanvas.width = width;
				offscreenCanvas.height = height;
				offscreenContext.drawImage(bitmap, 0, 0);

				if (bitmap instanceof ImageBitmap) {
					bitmap.close();
				}

				ctx.postMessage({
					type: "pageRendered",
					success: true,
					messageId,
					pageNumber,
					width,
					height,
					scale,
				} satisfies WorkerResponse);
				break;
			}

			case "zoom": {
				const { scale, fitMode, containerWidth, containerHeight } = payload;
				let targetScale = scale || currentScale;

				if (fitMode === "page" && containerWidth && containerHeight && currentTiff) {
					currentTiff.setDirectory(currentPageNumber);
					const originalWidth = currentTiff.width();
					const originalHeight = currentTiff.height();
					const scaleWidth = containerWidth / originalWidth;
					const scaleHeight = containerHeight / originalHeight;
					targetScale = Math.max(
						0.5,
						Math.min(3, Math.min(scaleWidth, scaleHeight)),
					);
				}

				await renderPageInternal(currentPageNumber, targetScale, messageId);
				break;
			}

			default:
				throw new Error(`Unknown message type: ${type}`);
		}
	} catch (error) {
		console.error(`TIFF Worker Error:`, error);
		ctx.postMessage({
			type: "error",
			success: false,
			messageId,
			error: {
				message: error instanceof Error ? error.message : "Unknown error",
			},
		} satisfies WorkerResponse);
	}
};
