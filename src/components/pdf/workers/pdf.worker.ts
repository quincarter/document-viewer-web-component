// src/workers/pdf.worker.ts

import {
	type PDFiumDocument,
	PDFiumLibrary,
	type PDFiumPage,
} from "@hyzyla/pdfium";

// `Window.postMessage`'s overloads (from the DOM lib) don't accept a transfer
// list; the worker's actual `DedicatedWorkerGlobalScope.postMessage` does.
const postMessageWithTransfer = self.postMessage as (
	message: unknown,
	transfer: Transferable[],
) => void;

let pdfLibrary: PDFiumLibrary | null = null;
let currentDocument: PDFiumDocument | null = null;
let currentDocumentId: string | null = null;
let offscreenCanvas: OffscreenCanvas | null = null;
let offscreenContext: OffscreenCanvasRenderingContext2D | null = null;

// Track state in worker for zoom/navigation
let currentPageNumber = 0;
let currentScale = 1.0;

/**
 * Common rendering logic shared by renderPage and zoom
 */
async function renderPageInternal(
	pageNumber: number,
	scale: number,
	messageId: number,
) {
	if (!pdfLibrary || !currentDocument) {
		throw new Error("No PDF document loaded or library not initialized.");
	}

	// Validate page number
	if (pageNumber < 0 || pageNumber >= currentDocument.getPageCount()) {
		throw new Error(
			`Invalid page number: ${pageNumber}. Document has ${currentDocument.getPageCount()} pages.`,
		);
	}

	try {
		// Update worker state
		currentPageNumber = pageNumber;
		currentScale = scale;

		// Get the page
		const page: PDFiumPage = currentDocument.getPage(pageNumber);
		const { originalWidth, originalHeight } = page.getOriginalSize();

		// Get page size and calculate scaled dimensions
		const width = Math.floor(originalWidth * scale);
		const height = Math.floor(originalHeight * scale);

		// Render the page with PDFium
		const renderResult = await page.render({
			render: "bitmap",
			width,
			height,
		});

		// Draw to offscreen canvas if available
		if (offscreenCanvas && offscreenContext) {
			offscreenCanvas.width = width;
			offscreenCanvas.height = height;
			const imageData = new ImageData(
				new Uint8ClampedArray(renderResult.data.buffer as ArrayBuffer),
				width,
				height,
			);
			offscreenContext.putImageData(imageData, 0, 0);
		}

		// Send back the rendered page info
		const message = {
			type: "pageRendered",
			success: true,
			messageId,
			documentId: currentDocumentId,
			pageNumber,
			width,
			height,
			scale, // Send back the scale used
		};

		// No longer need to transfer the large bitmap back to main thread
		self.postMessage(message);
	} catch (error) {
		console.error("Error rendering page:", error);
		self.postMessage({
			type: "pageRendered",
			success: false,
			messageId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
}

interface WorkerPayload {
	wasmUrl?: string;
	canvas?: OffscreenCanvas;
	pdfBuffer?: ArrayBuffer | Uint8Array;
	documentId?: string;
	pageNumber?: number;
	scale?: number;
	fitMode?: "width";
	containerWidth?: number;
	bitmap?: ImageBitmap;
	width?: number;
	height?: number;
}

interface WorkerInput {
	type: string;
	payload: WorkerPayload;
	messageId: number;
}

/**
 * Handles incoming messages from the main thread.
 */
self.onmessage = async (event: MessageEvent<WorkerInput>) => {
	const { type, payload, messageId } = event.data;

	try {
		switch (type) {
			case "init":
				if (!payload?.wasmUrl) {
					throw new Error("WASM URL not provided for init.");
				}
				console.log("Initializing PDFium with WASM URL:", payload.wasmUrl);
				if (!pdfLibrary) {
					try {
						pdfLibrary = await PDFiumLibrary.init({
							wasmUrl: payload.wasmUrl,
						});
						console.log("PDFium initialization successful");
					} catch (error) {
						console.error("PDFium initialization failed:", error);
						throw error;
					}
				}
				self.postMessage({
					type: "libraryInitialized",
					success: true,
					messageId,
				});
				break;

			case "initCanvas":
				if (!payload?.canvas) {
					throw new Error("Canvas not provided for initCanvas.");
				}
				offscreenCanvas = payload.canvas;
				offscreenContext = offscreenCanvas?.getContext(
					"2d",
				) as OffscreenCanvasRenderingContext2D | null;
				console.log("OffscreenCanvas initialized in worker");
				break;

			case "loadPdf": {
				if (!pdfLibrary) {
					throw new Error(
						'PDF library not initialized. Send "init" message first.',
					);
				}
				if (!payload?.pdfBuffer) {
					throw new Error("PDF buffer is required.");
				}

				// Ensure we have an ArrayBuffer
				let pdfBuffer: ArrayBuffer;
				if (payload.pdfBuffer instanceof ArrayBuffer) {
					pdfBuffer = payload.pdfBuffer;
				} else if (payload.pdfBuffer instanceof Uint8Array) {
					// Need to handle SharedArrayBuffer potentially if it comes from buffer property
					// But usually .buffer on Uint8Array is ArrayBuffer | SharedArrayBuffer
					pdfBuffer = payload.pdfBuffer.buffer as ArrayBuffer;
				} else {
					throw new Error(
						"Invalid PDF buffer type. Expected ArrayBuffer or Uint8Array.",
					);
				}

				try {
					// Clean up existing document before loading new one
					if (currentDocument) {
						currentDocument = null;
						currentDocumentId = null;
					}

					// Convert to Uint8Array for PDFium
					const pdfData = new Uint8Array(pdfBuffer);

					// Attempt to load the document
					currentDocument = await pdfLibrary.loadDocument(pdfData);

					if (!currentDocument) {
						throw new Error("Failed to load PDF document - result was null.");
					}

					currentDocumentId = payload.documentId || `doc-${Date.now()}`;
					const pageCount = currentDocument.getPageCount();

					if (pageCount <= 0) {
						throw new Error("PDF document contains no pages.");
					}

					// Reset state for new document
					currentPageNumber = 0;
					currentScale = 1.0;

					self.postMessage({
						type: "pdfLoaded",
						documentId: currentDocumentId,
						pageCount: pageCount,
						success: true,
						messageId,
					});
				} catch (error) {
					currentDocument = null;
					currentDocumentId = null;
					throw error;
				}
				break;
			}

			case "renderPage": {
				if (!currentDocument) {
					throw new Error("No PDF document loaded.");
				}
				const { pageNumber, scale, fitMode, containerWidth } = payload;
				if (pageNumber === undefined) {
					throw new Error("pageNumber is required for renderPage.");
				}

				let targetScale = scale !== undefined ? scale : currentScale;

				if (fitMode === "width" && containerWidth) {
					const page: PDFiumPage = currentDocument.getPage(pageNumber);
					const { originalWidth } = page.getOriginalSize();
					const newScale = Math.max(
						0.5,
						Math.min(3, containerWidth / originalWidth),
					);
					targetScale = Math.round(newScale * 100) / 100;
				}

				await renderPageInternal(pageNumber, targetScale, messageId);
				break;
			}

			case "renderToBitmap": {
				if (!pdfLibrary || !currentDocument) {
					throw new Error("No PDF document loaded.");
				}
				const { pageNumber, scale } = payload;
				if (pageNumber === undefined || scale === undefined) {
					throw new Error(
						"pageNumber and scale are required for renderToBitmap.",
					);
				}

				const page: PDFiumPage = currentDocument.getPage(pageNumber);
				const { originalWidth, originalHeight } = page.getOriginalSize();
				const width = Math.floor(originalWidth * scale);
				const height = Math.floor(originalHeight * scale);

				const renderResult = await page.render({
					render: "bitmap",
					width,
					height,
				});

				const imageData = new ImageData(
					new Uint8ClampedArray(renderResult.data.buffer as ArrayBuffer),
					width,
					height,
				);
				const bitmap = await createImageBitmap(imageData);

				postMessageWithTransfer(
					{
						type: "pageToBitmap",
						success: true,
						messageId,
						pageNumber,
						scale,
						bitmap,
						width,
						height,
					},
					[bitmap],
				);
				break;
			}

			case "drawBitmap": {
				if (!offscreenCanvas || !offscreenContext) {
					throw new Error("Offscreen canvas not initialized.");
				}
				const { bitmap, width, height, pageNumber, scale } = payload;
				if (!bitmap || width === undefined || height === undefined) {
					throw new Error(
						"bitmap, width and height are required for drawBitmap.",
					);
				}

				offscreenCanvas.width = width;
				offscreenCanvas.height = height;
				offscreenContext.drawImage(bitmap, 0, 0);

				// Close the bitmap after drawing to free memory if it was transferred
				if (bitmap instanceof ImageBitmap) {
					bitmap.close();
				}

				self.postMessage({
					type: "pageRendered", // Re-use pageRendered type for UI consistency
					success: true,
					messageId,
					pageNumber,
					width,
					height,
					scale,
				});
				break;
			}

			case "zoom": {
				if (!currentDocument) {
					throw new Error("No PDF document loaded.");
				}

				const { scale, fitMode, containerWidth } = payload;
				let targetScale = scale;

				if (fitMode === "width" && containerWidth) {
					const page: PDFiumPage = currentDocument.getPage(currentPageNumber);
					const { originalWidth } = page.getOriginalSize();
					const newScale = Math.max(
						0.5,
						Math.min(3, containerWidth / originalWidth),
					);
					targetScale = Math.round(newScale * 100) / 100;
				}

				if (targetScale === undefined) {
					throw new Error("Scale or fitMode must be provided for zoom.");
				}

				await renderPageInternal(currentPageNumber, targetScale, messageId);
				break;
			}

			default:
				throw new Error(`Unknown message type: ${type}`);
		}
	} catch (error) {
		console.error(`PDF Worker Error:`, error);
		self.postMessage({
			type: "error",
			messageId,
			error: {
				message: (error as Error).message,
				stack: (error as Error).stack,
			},
		});
	}
};

// Optional: Handle unhandled promise rejections within the worker
self.addEventListener("unhandledrejection", (event) => {
	console.error("PDF Worker: Unhandled Promise Rejection:", event.reason);
	self.postMessage({
		type: "error",
		message: `Unhandled promise rejection: ${
			(event.reason as Error)?.message || event.reason
		}`,
		success: false,
	});
});

console.log("PDF Worker initialized and ready.");
