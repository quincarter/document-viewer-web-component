// src/components/tiff/TiffViewer.ts

import type { PropertyValueMap } from "lit";
import { customElement, query } from "lit/decorators.js";
import { BaseDocumentViewer } from "../common/BaseDocumentViewer";
import { TiffViewerStyles } from "./tiff-viewer.styles";
// Import worker instances (Vite inline worker syntax)
import TiffWorker from "./workers/tiff.worker?worker&inline";

interface DocumentWorker extends Worker {
	postMessage(message: unknown, transfer: Transferable[]): void;
	postMessage(message: unknown, options?: StructuredSerializeOptions): void;
}

interface HTMLCanvasElementWithOffscreen extends HTMLCanvasElement {
	transferControlToOffscreen(): OffscreenCanvas;
}

export interface WorkerMessage {
	type: string;
	success?: boolean;
	messageId?: number;
	pageCount?: number;
	documentId?: string;
	scale?: number;
	width?: number;
	height?: number;
	pageNumber?: number;
	bitmap?: ImageBitmap;
	error?: { message: string };
}

interface TiffRenderPayload {
	pageNumber: number;
	scale: number;
	documentId: string | null;
	fitMode?: "page";
	containerWidth?: number;
	containerHeight?: number;
}

@customElement("tiff-viewer")
export class TiffViewer extends BaseDocumentViewer {
	@query("#viewerCanvas")
	protected _canvas!: HTMLCanvasElement;

	protected _tiffWorkers: DocumentWorker[] = [];
	protected _workerMessageIdCounter = 0;
	protected _pendingWorkerMessages = new Map<
		number,
		(value: WorkerMessage) => void
	>();
	protected _pendingFileLoad: { source: string | File } | null = null;

	protected _pageCache = new Map<
		number,
		{ bitmap: ImageBitmap; width: number; height: number; scale: number }
	>();
	protected _prefetchQueue: number[] = [];
	protected _busyWorkers = new Set<DocumentWorker>();
	protected _initializedWorkersCount = 0;
	protected readonly _poolSize = 4;
	protected _currentDocumentId: string | null = null;

	static styles = [...BaseDocumentViewer.styles, TiffViewerStyles];

	constructor() {
		super();
		this.viewerTitle = "TIFF Viewer";
		this._initializeWorkers();
	}

	protected _initializeWorkers() {
		// Clean up existing workers if any
		for (const worker of this._tiffWorkers) {
			worker.terminate();
		}
		this._tiffWorkers = [];
		this._busyWorkers.clear();
		this._initializedWorkersCount = 0;

		for (let i = 0; i < this._poolSize; i++) {
			const worker = new TiffWorker() as DocumentWorker;
			worker.onmessage = (e) =>
				this._handleWorkerMessage(e.data as WorkerMessage, `TIFF-${i}`);
			worker.onerror = (e) => this._handleWorkerError(e, `TIFF-${i}`);

			this._tiffWorkers.push(worker);

			this._sendMessageToWorker(worker, "init", {});
		}
	}

	connectedCallback() {
		super.connectedCallback();
		if (this._tiffWorkers.length === 0) this._initializeWorkers();
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		for (const worker of this._tiffWorkers) {
			worker.terminate();
		}
		this._tiffWorkers = [];
		for (const resolve of this._pendingWorkerMessages.values()) {
			resolve({ type: "error", error: { message: "Worker terminated" } });
		}
		this._pendingWorkerMessages.clear();
		this._clearPageCache();
	}

	protected _clearPageCache() {
		for (const entry of this._pageCache.values()) {
			entry.bitmap.close();
		}
		this._pageCache.clear();
	}

	protected firstUpdated(
		changedProperties: PropertyValueMap<this> | Map<PropertyKey, unknown>,
	): void {
		super.firstUpdated(changedProperties);

		if (this._canvas) {
			const mainWorker = this._tiffWorkers[0];
			const canvas = this._canvas as HTMLCanvasElementWithOffscreen;
			if (
				"transferControlToOffscreen" in canvas &&
				mainWorker &&
				typeof canvas.transferControlToOffscreen === "function"
			) {
				try {
					const offscreen = canvas.transferControlToOffscreen();
					mainWorker.postMessage(
						{ type: "initCanvas", payload: { canvas: offscreen } },
						[offscreen],
					);
				} catch (error) {
					console.error(
						"TIFF Viewer: Failed to transfer control to offscreen canvas.",
						error,
					);
					this._errorMessage =
						"Failed to initialize high-performance rendering.";
				}
			}
		}
	}

	protected _resetViewerState() {
		super._resetViewerState();
		this._currentDocumentId = `doc-${Date.now()}`;
		this._clearPageCache();
	}

	protected async _loadFile(source: string | File) {
		if (!this._isInitialized) {
			this._pendingFileLoad = { source };
			return;
		}

		this._isLoading = true;
		this._errorMessage = null;

		try {
			let buffer: ArrayBuffer;

			if (typeof source === "string") {
				const response = await fetch(source);
				if (!response.ok) {
					throw new Error(`Failed to fetch file: ${response.statusText}`);
				}
				buffer = await response.arrayBuffer();
			} else {
				buffer = await source.arrayBuffer();
			}

			if (this._tiffWorkers.length === 0) {
				throw new Error("TIFF workers not initialized");
			}

			// Load the TIFF into all workers
			const loadPromises = this._tiffWorkers.map((worker) => {
				return this._sendMessageToWorker(worker, "loadTiff", {
					tiffBuffer: buffer, // Cloned for each worker
					documentId: this._currentDocumentId,
				});
			});

			await Promise.all(loadPromises);
		} catch (error) {
			this._handleError(`Failed to load file: ${(error as Error).message}`);
		}
	}

	protected _renderCurrentPage() {
		if (this._totalPages === 0 || this._isLoading) return;
		this._errorMessage = null;

		const pageNumToRender = this._currentPageNumber - 1;

		const cached = this._pageCache.get(pageNumToRender);
		const mainWorker = this._tiffWorkers[0];

		if (!this._isFitToView && cached && cached.scale === this._displayScale) {
			createImageBitmap(cached.bitmap).then((clonedBitmap) => {
				this._sendMessageToWorker(
					mainWorker,
					"drawBitmap",
					{
						bitmap: clonedBitmap,
						width: cached.width,
						height: cached.height,
						pageNumber: pageNumToRender,
						scale: cached.scale,
					},
					[clonedBitmap],
				);
			});
			return;
		}

		if (mainWorker) {
			const payload: TiffRenderPayload = {
				pageNumber: pageNumToRender,
				scale: this._displayScale,
				documentId: this._currentDocumentId,
			};

			if (this._isFitToView && this._contentArea) {
				payload.fitMode = "page";
				payload.containerWidth = this._contentArea.clientWidth - 32;
				payload.containerHeight = this._contentArea.clientHeight - 32;
			}

			this._sendMessageToWorker(mainWorker, "renderPage", payload);
		}
	}

	protected _handleZoomChange(newScale: number): void {
		this._clearPageCache();
		const mainWorker = this._tiffWorkers[0];
		if (mainWorker) {
			this._sendMessageToWorker(mainWorker, "zoom", {
				scale: newScale,
			});
		}
	}

	protected _handleFitToViewChange(
		fitMode: "page",
		containerWidth: number,
		containerHeight: number,
	): void {
		const mainWorker = this._tiffWorkers[0];
		if (mainWorker) {
			this._sendMessageToWorker(mainWorker, "zoom", {
				fitMode,
				containerWidth,
				containerHeight,
			});
		}
	}

	protected _prefetchNextPages() {
		if (this._totalPages === 0) return;

		const currentIdx = this._currentPageNumber - 1;
		const nextPages = [];
		for (let i = 1; i <= 5; i++) {
			const nextIdx = currentIdx + i;
			if (nextIdx < this._totalPages) nextPages.push(nextIdx);
		}
		for (let i = 1; i <= 2; i++) {
			const prevIdx = currentIdx - i;
			if (prevIdx >= 0) nextPages.push(prevIdx);
		}

		const pagesToFetch = nextPages.filter((p) => {
			const cached = this._pageCache.get(p);
			return !cached || cached.scale !== this._displayScale;
		});

		for (const pageIdx of this._pageCache.keys()) {
			if (Math.abs(pageIdx - currentIdx) > 10) {
				const entry = this._pageCache.get(pageIdx);
				entry?.bitmap.close();
				this._pageCache.delete(pageIdx);
			}
		}

		this._prefetchQueue = pagesToFetch;
		this._processPrefetchQueue();
	}

	protected _processPrefetchQueue() {
		if (this._prefetchQueue.length === 0) return;

		for (let i = 1; i < this._tiffWorkers.length; i++) {
			const worker = this._tiffWorkers[i];
			if (!this._busyWorkers.has(worker) && this._prefetchQueue.length > 0) {
				const pageIdx = this._prefetchQueue.shift();
				if (pageIdx === undefined) continue;

				this._busyWorkers.add(worker);

				this._sendMessageToWorker(worker, "renderToBitmap", {
					pageNumber: pageIdx,
					scale: this._displayScale,
				}).finally(() => {
					this._busyWorkers.delete(worker);
					this._processPrefetchQueue();
				});
			}
		}
	}

	protected _handleWorkerMessage(data: WorkerMessage, workerName: string) {
		const { type, success, messageId } = data;

		if (messageId != null && this._pendingWorkerMessages.has(messageId)) {
			const resolve = this._pendingWorkerMessages.get(messageId);
			if (!resolve) return;
			this._pendingWorkerMessages.delete(messageId);
			resolve(data);
		}

		switch (type) {
			case "libraryInitialized":
				if (success) {
					this._initializedWorkersCount++;
					if (this._initializedWorkersCount === this._poolSize) {
						this._isInitialized = true;
						if (this._pendingFileLoad) {
							this._loadFile(this._pendingFileLoad.source);
							this._pendingFileLoad = null;
						}
					}
				}
				break;

			case "tiffLoaded":
				if (success) {
					if (workerName === "TIFF-0") {
						this._totalPages = data.pageCount || 0;
						this._isLoading = false;
						this._renderCurrentPage();
					}
				} else {
					this._handleError("Failed to load TIFF");
				}
				break;

			case "pageRendered":
				if (success) {
					if (data.scale) {
						this._currentScale = data.scale;
						this._displayScale = data.scale;
					}
					if (data.width && data.height && data.scale) {
						this._originalPageWidth = data.width / data.scale;
						this._originalPageHeight = data.height / data.scale;
					}
					this._isLoading = false;
					this._prefetchNextPages();
				} else {
					this._handleError("Failed to render page");
				}
				break;

			case "pageToBitmap":
				if (success) {
					const { pageNumber, bitmap, width, height, scale } = data;
					if (pageNumber !== undefined && bitmap && width && height && scale) {
						const existing = this._pageCache.get(pageNumber);
						if (existing) {
							existing.bitmap.close();
						}
						this._pageCache.set(pageNumber, { bitmap, width, height, scale });
					}
				}
				break;

			case "error":
				this._handleError(data.error?.message || "Unknown error occurred");
				break;
		}
	}

	protected _handleWorkerError(error: Event | ErrorEvent, workerName: string) {
		console.error(`Error in ${workerName} worker:`, error);
		this._handleError(
			error instanceof ErrorEvent ? error.message : "Worker error occurred",
		);
	}

	protected _sendMessageToWorker(
		worker: DocumentWorker,
		type: string,
		payload: unknown,
		transferList?: Transferable[],
	): Promise<unknown> {
		return new Promise((resolve) => {
			const messageId = this._workerMessageIdCounter++;
			this._pendingWorkerMessages.set(messageId, resolve);
			worker.postMessage({ type, payload, messageId }, transferList || []);

			setTimeout(() => {
				if (this._pendingWorkerMessages.has(messageId)) {
					this._pendingWorkerMessages.delete(messageId);
					resolve({
						type: "error",
						message: `Worker response timeout (${type})`,
					});
				}
			}, 30000);
		});
	}
}
