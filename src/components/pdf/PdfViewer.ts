// src/components/pdf/PdfViewer.ts

import pdfiumWasmUrl from "@hyzyla/pdfium/pdfium.wasm?url";
// Import WASM URLs (Vite syntax)
import { html, LitElement, type PropertyValueMap } from "lit";
import { property, query, state } from "lit/decorators.js";
import { ViewerControlsSharedStyles } from "../common/viewer-controls.styles";
import { PdfViewerStyles } from "./pdf-viewer.styles";
// Import worker instances (Vite inline worker syntax)
import PdfWorker from "./workers/pdf.worker?worker&inline";

interface DocumentWorker extends Worker {
	postMessage(message: unknown, transfer: Transferable[]): void;
	postMessage(message: unknown, options?: StructuredSerializeOptions): void;
}

interface HTMLCanvasElementWithOffscreen extends HTMLCanvasElement {
	transferControlToOffscreen(): OffscreenCanvas;
}

interface WorkerMessage {
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
	// biome-ignore lint/suspicious/noExplicitAny: Worker data can contain arbitrary payloads
	[key: string]: any;
}

interface RenderPagePayload {
	pageNumber: number;
	scale: number;
	documentId: string | null;
	fitMode?: "width";
	containerWidth?: number;
}

export class PdfViewer extends LitElement {
	@property({ type: String })
	src: string | File | null = null;

	@property({ type: String })
	viewerTitle: string = "PDF Viewer";

	@state()
	private _isLoading: boolean = false;
	@state()
	private _errorMessage: string | null = null;
	@state()
	private _currentPageNumber: number = 1; // 1-indexed for UI
	@state()
	private _totalPages: number = 0;
	@state()
	private _currentScale: number = 1.0; // The scale at which the worker rendered the current bitmap
	@state()
	private _displayScale: number = 1.0; // The scale currently applied via CSS
	@state()
	private _isFitToView: boolean = true;
	@state()
	private _currentDocumentId: string | null = null; // To correlate worker responses
	@state()
	private _isInitialized: boolean = false;

	@state()
	private _originalPageWidth: number = 0;
	@state()
	private _originalPageHeight: number = 0;

	@query("#viewerCanvas")
	private _canvas!: HTMLCanvasElement;
	@query(".content-area")
	private _contentArea!: HTMLElement;
	private _resizeObserver: ResizeObserver | null = null;
	private _zoomDebounceTimer: number | null = null;

	private _pdfWorkers: DocumentWorker[] = [];
	private _workerMessageIdCounter = 0;
	private _pendingWorkerMessages = new Map<number, (value: unknown) => void>();
	private _pendingFileLoad: { source: string | File } | null = null;

	private _pageCache = new Map<
		number,
		{ bitmap: ImageBitmap; width: number; height: number; scale: number }
	>();
	private _prefetchQueue: number[] = [];
	private _busyWorkers = new Set<DocumentWorker>();
	private _initializedWorkersCount = 0;
	private readonly _poolSize = 4;

	static styles = [ViewerControlsSharedStyles, PdfViewerStyles];

	constructor() {
		super();
		this._initializeWorkers();
	}

	private _initializeWorkers() {
		// Clean up existing workers if any
		for (const worker of this._pdfWorkers) {
			worker.terminate();
		}
		this._pdfWorkers = [];
		this._busyWorkers.clear();
		this._initializedWorkersCount = 0;

		const wasmUrl = new URL(pdfiumWasmUrl, window.location.origin).toString();

		for (let i = 0; i < this._poolSize; i++) {
			const worker = new PdfWorker() as DocumentWorker;
			worker.onmessage = (e) =>
				this._handleWorkerMessage(e.data as WorkerMessage, `PDF-${i}`);
			worker.onerror = (e) => this._handleWorkerError(e, `PDF-${i}`);

			this._pdfWorkers.push(worker);

			this._sendMessageToWorker(worker, "init", {
				wasmUrl: wasmUrl,
			});
		}
	}

	connectedCallback() {
		super.connectedCallback();
		if (this._pdfWorkers.length === 0) this._initializeWorkers();
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this._resizeObserver?.disconnect();
		this._resizeObserver = null;
		if (this._zoomDebounceTimer) {
			window.clearTimeout(this._zoomDebounceTimer);
			this._zoomDebounceTimer = null;
		}
		for (const worker of this._pdfWorkers) {
			worker.terminate();
		}
		this._pdfWorkers = [];
		for (const resolve of this._pendingWorkerMessages.values()) {
			resolve({ type: "error", message: "Worker terminated" });
		}
		this._pendingWorkerMessages.clear();
		this._clearPageCache();
	}

	private _clearPageCache() {
		for (const entry of this._pageCache.values()) {
			entry.bitmap.close();
		}
		this._pageCache.clear();
	}

	protected firstUpdated(
		_changedProperties: PropertyValueMap<this> | Map<PropertyKey, unknown>,
	): void {
		if (this._canvas) {
			const mainWorker = this._pdfWorkers[0];
			const canvas = this._canvas as HTMLCanvasElementWithOffscreen;
			// Transfer control to worker for off-main-thread rendering
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
						"PDF Viewer: Failed to transfer control to offscreen canvas.",
						error,
					);
					this._errorMessage =
						"Failed to initialize high-performance rendering.";
				}
			} else {
				console.warn(
					"PDF Viewer: OffscreenCanvas not supported in this browser.",
				);
				this._errorMessage =
					"Your browser does not support high-performance rendering.";
			}
		} else {
			console.error("PDF Viewer: Canvas element not found.");
			this._errorMessage = "Canvas element could not be initialized.";
		}

		// Watch for container size changes to re-apply fit-to-view
		if (this._contentArea) {
			this._resizeObserver = new ResizeObserver(() => {
				if (this._isFitToView) {
					this._applyFitToView();
				}
			});
			this._resizeObserver.observe(this._contentArea);
		}

		if (this.src) {
			this._loadFile(this.src);
		}
	}

	protected updated(
		changedProperties: PropertyValueMap<this> | Map<PropertyKey, unknown>,
	): void {
		if (changedProperties.has("src") && this.src) {
			this._resetViewerState();
			this._loadFile(this.src);
		}
	}

	private _resetViewerState() {
		// this._isLoading = false;
		this._errorMessage = null;
		this._currentPageNumber = 1;
		this._totalPages = 0;
		this._currentDocumentId = `doc-${Date.now()}`;
		this._clearPageCache();
	}

	private _handleError(message: string) {
		this._errorMessage = message;
		this._isLoading = false;
		console.error("PDF Viewer Error:", message);
	}

	private async _loadFile(source: string | File) {
		if (!this._isInitialized) {
			console.log("Waiting for PDFium initialization...");
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

			// Check if it's a PDF
			const header = new Uint8Array(buffer.slice(0, 5));
			const isPDF =
				header[0] === 0x25 && // %
				header[1] === 0x50 && // P
				header[2] === 0x44 && // D
				header[3] === 0x46 && // F
				header[4] === 0x2d; // -

			if (!isPDF) {
				throw new Error("Not a valid PDF file");
			}

			if (this._pdfWorkers.length === 0) {
				throw new Error("PDF workers not initialized");
			}

			// Load the PDF into all workers
			const loadPromises = this._pdfWorkers.map((worker) => {
				// We don't transfer the buffer because we need it for all workers
				// In a real app we might use SharedArrayBuffer if available
				return this._sendMessageToWorker(worker, "loadPdf", {
					pdfBuffer: buffer, // This will be cloned
					documentId: this._currentDocumentId,
				});
			});

			await Promise.all(loadPromises);
		} catch (error) {
			this._handleError(`Failed to load file: ${(error as Error).message}`);
		}
	}

	private _renderCurrentPage() {
		if (this._totalPages === 0 || this._isLoading) return;
		this._errorMessage = null;

		const pageNumToRender = this._currentPageNumber - 1; // Workers use 0-indexed

		// Check cache
		const cached = this._pageCache.get(pageNumToRender);
		const mainWorker = this._pdfWorkers[0];

		if (cached && cached.scale === this._currentScale) {
			// Fast path: draw from cache
			// We clone the bitmap for the worker because it will close it after drawing
			// or we can just send it and remove from cache?
			// Better: send the bitmap and remove it from cache, then it will be re-added if we prefetch again.
			// Actually, if we want to keep it in memory, we should clone it.
			// createImageBitmap is efficient.

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
			const payload: RenderPagePayload = {
				pageNumber: pageNumToRender,
				scale: this._currentScale,
				documentId: this._currentDocumentId,
			};

			if (this._isFitToView && this._contentArea) {
				payload.fitMode = "width";
				payload.containerWidth = this._contentArea.clientWidth - 32;
			}

			this._sendMessageToWorker(mainWorker, "renderPage", payload);
		} else {
			this._handleError("PDF worker not initialized");
			this._isLoading = false;
		}
	}

	private _prefetchNextPages() {
		if (this._totalPages === 0) return;

		const currentIdx = this._currentPageNumber - 1;
		const nextPages = [];
		// Next 5 pages
		for (let i = 1; i <= 5; i++) {
			const nextIdx = currentIdx + i;
			if (nextIdx < this._totalPages) nextPages.push(nextIdx);
		}
		// Also keep previous 2 pages
		for (let i = 1; i <= 2; i++) {
			const prevIdx = currentIdx - i;
			if (prevIdx >= 0) nextPages.push(prevIdx);
		}

		// Filter out pages already in cache
		const pagesToFetch = nextPages.filter((p) => {
			const cached = this._pageCache.get(p);
			return !cached || cached.scale !== this._currentScale;
		});

		// Clean up cache for pages far away
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

	private _processPrefetchQueue() {
		if (this._prefetchQueue.length === 0) return;

		// Use all workers except the main one for pre-fetching
		for (let i = 1; i < this._pdfWorkers.length; i++) {
			const worker = this._pdfWorkers[i];
			if (!this._busyWorkers.has(worker) && this._prefetchQueue.length > 0) {
				const pageIdx = this._prefetchQueue.shift();
				if (pageIdx === undefined) continue;

				this._busyWorkers.add(worker);

				this._sendMessageToWorker(worker, "renderToBitmap", {
					pageNumber: pageIdx,
					scale: this._currentScale,
				}).finally(() => {
					this._busyWorkers.delete(worker);
					this._processPrefetchQueue();
				});
			}
		}
	}

	private _handleWorkerMessage(data: WorkerMessage, workerName: string) {
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
					console.log(`${workerName} initialization complete`);
					this._initializedWorkersCount++;

					if (this._initializedWorkersCount === this._poolSize) {
						this._isInitialized = true;
						if (this._pendingFileLoad) {
							console.log("Processing pending file load");
							this._loadFile(this._pendingFileLoad.source);
							this._pendingFileLoad = null;
						}
					}
				}
				break;

			case "pdfLoaded":
				if (success) {
					// Only the main worker response is needed for metadata
					if (workerName === "PDF-0") {
						this._totalPages = data.pageCount || 0;
						this._currentDocumentId = data.documentId || null;
						this._isLoading = false;
						// Trigger initial page render
						this._renderCurrentPage();
					}
				} else {
					this._handleError("Failed to load PDF");
				}
				break;

			case "pageRendered":
				if (success) {
					// Update scale from worker (relevant for fit-to-view)
					if (data.scale) {
						this._currentScale = data.scale;
						this._displayScale = data.scale;
					}
					if (data.width && data.height && data.scale) {
						this._originalPageWidth = data.width / data.scale;
						this._originalPageHeight = data.height / data.scale;
					}
					this._isLoading = false;
					// Trigger pre-fetching after a successful render
					this._prefetchNextPages();
				} else {
					this._handleError("Failed to render page");
				}
				break;

			case "pageToBitmap":
				if (success) {
					const { pageNumber, bitmap, width, height, scale } = data;
					if (pageNumber !== undefined && bitmap && width && height && scale) {
						// Add to cache
						// If we already have a bitmap for this page at a different scale, close it
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

			default:
				console.warn(`Unknown message type from ${workerName} worker:`, data);
		}
	}

	private _handleWorkerError(error: Event | ErrorEvent, workerName: string) {
		console.error(`Error in ${workerName} worker:`, error);
		this._handleError(
			error instanceof ErrorEvent ? error.message : "Worker error occurred",
		);
	}

	private _sendMessageToWorker(
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

	private _goToPreviousPage() {
		if (this._currentPageNumber > 1) {
			this._currentPageNumber--;
			this._renderCurrentPage();
		}
	}

	private _goToNextPage() {
		if (this._currentPageNumber < this._totalPages) {
			this._currentPageNumber++;
			this._renderCurrentPage();
		}
	}

	private _handlePageInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const page = parseInt(input.value, 10);
		if (!Number.isNaN(page) && page >= 1 && page <= this._totalPages) {
			this._currentPageNumber = page;
			this._renderCurrentPage();
		} else {
			input.value = this._currentPageNumber.toString();
		}
	}

	private _handleZoomSliderChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const newScale = parseFloat(input.value);
		this._isFitToView = false;
		this._displayScale = newScale;

		// Clear cache on zoom change
		this._clearPageCache();

		// Debounce high-quality re-render
		if (this._zoomDebounceTimer) {
			window.clearTimeout(this._zoomDebounceTimer);
		}

		this._zoomDebounceTimer = window.setTimeout(() => {
			const mainWorker = this._pdfWorkers[0];
			if (mainWorker) {
				this._sendMessageToWorker(mainWorker, "zoom", {
					scale: newScale,
				});
			}
			this._zoomDebounceTimer = null;
		}, 150);
	}

	private _handleFitToView() {
		this._isFitToView = true;
		this._clearPageCache();
		this._applyFitToView(true); // immediate if user clicked
	}

	/**
	 * Sends a zoom message to the worker with fit-to-width instruction.
	 */
	private _applyFitToView(immediate = false) {
		const mainWorker = this._pdfWorkers[0];
		if (!this._contentArea || !mainWorker || !this._originalPageWidth) return;

		const containerWidth = this._contentArea.clientWidth - 32; // 1rem padding each side
		const newScale = Math.max(
			0.5,
			Math.min(3, containerWidth / this._originalPageWidth),
		);
		this._displayScale = newScale;

		const requestZoom = () => {
			this._sendMessageToWorker(mainWorker, "zoom", {
				fitMode: "width",
				containerWidth: containerWidth,
			});
			this._zoomDebounceTimer = null;
		};

		if (this._zoomDebounceTimer) {
			window.clearTimeout(this._zoomDebounceTimer);
		}

		if (immediate) {
			requestZoom();
		} else {
			this._zoomDebounceTimer = window.setTimeout(requestZoom, 150);
		}
	}

	render() {
		const zoomPercent = Math.round(this._displayScale * 100);
		const canNav = this._totalPages > 0 && !this._isLoading;

		const canvasWidth = this._originalPageWidth
			? `${Math.round(this._originalPageWidth * this._displayScale)}px`
			: "auto";
		const canvasHeight = this._originalPageHeight
			? `${Math.round(this._originalPageHeight * this._displayScale)}px`
			: "auto";

		return html`
      <div class="viewer-container">
        <main class="content-area">
          <canvas 
            id="viewerCanvas"
            style="width: ${canvasWidth}; height: ${canvasHeight};"
          ></canvas>
          ${
						this._isLoading
							? html`<div class="status-overlay">
                <div class="message">
                  <div class="loader"></div>
                  <p>Loading…</p>
                </div>
              </div>`
							: ""
					}
          ${
						this._errorMessage
							? html`<div class="status-overlay">
                <div class="message error-message">
                  <p>Error: ${this._errorMessage}</p>
                  <button
                    class="ctrl-btn"
                    @click=${() => {
											this._errorMessage = null;
											this._resetViewerState();
										}}
                  >
                    Dismiss
                  </button>
                </div>
              </div>`
							: ""
					}
        </main>

        <!-- Floating bottom toolbar -->
        <div class="toolbar-wrap">
          <div class="ctrl-bar">
            <!-- Prev page -->
            <button
              class="ctrl-btn icon-only"
              title="Previous page"
              @click=${this._goToPreviousPage}
              ?disabled=${this._currentPageNumber <= 1 || !canNav}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>

            <!-- Page input -->
            <span class="ctrl-page-info">
              <input
                class="ctrl-page-input"
                type="number"
                .value=${this._currentPageNumber.toString()}
                min="1"
                .max=${this._totalPages.toString()}
                @change=${this._handlePageInputChange}
                ?disabled=${!canNav}
                aria-label="Current page"
              />
              <span>/ ${this._totalPages || "—"}</span>
            </span>

            <!-- Next page -->
            <button
              class="ctrl-btn icon-only"
              title="Next page"
              @click=${this._goToNextPage}
              ?disabled=${
								this._currentPageNumber >= this._totalPages || !canNav
							}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
              </svg>
            </button>

            <div class="ctrl-divider"></div>

            <!-- Fit to view -->
            <button
              class="ctrl-btn ${this._isFitToView ? "active" : ""}"
              title="Fit to view"
              @click=${this._handleFitToView}
              ?disabled=${!canNav}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M3 3h7v2H5v5H3V3zm11 0h7v7h-2V5h-5V3zM3 14h2v5h5v2H3v-7zm16 5h-5v2h7v-7h-2v5z"
                />
              </svg>
              Fit
            </button>

            <!-- Zoom range slider -->
            <div class="ctrl-zoom-wrap">
              <input
                class="ctrl-range"
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                .value=${this._displayScale.toString()}
                @input=${this._handleZoomSliderChange}
                ?disabled=${!canNav}
                aria-label="Zoom level"
              />
              <span class="ctrl-zoom-label">${zoomPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    `;
	}
}
