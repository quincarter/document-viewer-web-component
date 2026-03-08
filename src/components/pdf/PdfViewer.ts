// src/components/pdf/PdfViewer.ts

// Import WASM URLs (Vite syntax)
import { html, LitElement, type PropertyValueMap } from "lit";
import { property, query, state } from "lit/decorators.js";
import { PdfViewerStyles } from "./pdf-viewer.styles";
import { ViewerControlsSharedStyles } from "../common/viewer-controls.styles";
import pdfiumWasmUrl from "@hyzyla/pdfium/pdfium.wasm?url";
// Import worker instances (Vite inline worker syntax)
import PdfWorker from "./workers/pdf.worker?worker&inline";

interface DocumentWorker extends Worker {
  postMessage(message: unknown, transfer: Transferable[]): void;
  postMessage(message: unknown, options?: StructuredSerializeOptions): void;
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
  private _currentScale: number = 1.0; // overridden by fit-to-view on first render
  @state()
  private _isFitToView: boolean = true;
  @state()
  private _currentDocumentId: string | null = null; // To correlate worker responses
  @state()
  private _isInitialized: boolean = false;
  /** Native page dimensions from the last rendered page (device pixels before scale) */
  private _nativePageWidth: number = 0;

  @query("#viewerCanvas")
  private _canvas!: HTMLCanvasElement;
  @query(".content-area")
  private _contentArea!: HTMLElement;
  private _canvasContext!: CanvasRenderingContext2D | null;
  private _resizeObserver: ResizeObserver | null = null;

  private _pdfWorker!: DocumentWorker | null;
  private _workerMessageIdCounter = 0;
  private _pendingWorkerMessages = new Map<number, (value: unknown) => void>();
  private _pendingFileLoad: { source: string | File } | null = null;

  static styles = [ViewerControlsSharedStyles, PdfViewerStyles];

  constructor() {
    super();
    this._initializeWorkers();
  }

  private _initializeWorkers() {
    this._pdfWorker = new PdfWorker() as DocumentWorker;
    this._pdfWorker.onmessage = (e) => this._handleWorkerMessage(e.data, "PDF");
    this._pdfWorker.onerror = (e) => this._handleWorkerError(e, "PDF");

    // Manually construct absolute URL for WASM file
    const wasmUrl = new URL(pdfiumWasmUrl, window.location.origin).toString();

    this._sendMessageToWorker(this._pdfWorker, "init", {
      wasmUrl: wasmUrl,
    });
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this._pdfWorker) this._initializeWorkers();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._pdfWorker?.terminate();
    this._pdfWorker = null;
    for (const resolve of this._pendingWorkerMessages.values()) {
      resolve({ type: "error", message: "Worker terminated" });
    }
    this._pendingWorkerMessages.clear();
  }

  protected firstUpdated(
    // biome-ignore lint/suspicious/noExplicitAny: Lit PropertyValueMap requires any for type guard
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    if (this._canvas) {
      this._canvasContext = this._canvas.getContext("2d");
    } else {
      console.error("PDF Viewer: Canvas element not found.");
      this._errorMessage = "Canvas element could not be initialized.";
    }

    // Watch for container size changes to re-apply fit-to-view
    if (this._contentArea) {
      this._resizeObserver = new ResizeObserver(() => {
        if (this._isFitToView && this._nativePageWidth > 0) {
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
    // biome-ignore lint/suspicious/noExplicitAny: Lit PropertyValueMap requires any for type guard
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
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
    if (this._canvasContext && this._canvas) {
      this._canvasContext.clearRect(
        0,
        0,
        this._canvas.width,
        this._canvas.height,
      );
      this._canvas.width = 300;
      this._canvas.height = 150;
    }
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

      if (!this._pdfWorker) {
        throw new Error("PDF worker not initialized");
      }

      await this._sendMessageToWorker(this._pdfWorker, "loadPdf", {
        pdfBuffer: buffer,
        documentId: this._currentDocumentId,
      });
    } catch (error) {
      this._handleError(`Failed to load file: ${(error as Error).message}`);
    }
  }

  private _renderCurrentPage() {
    if (this._totalPages === 0 || this._isLoading) return;
    // this._isLoading = true; // avoid setting this here to avoid flicker. add back if it causes issues
    this._errorMessage = null;

    const pageNumToRender = this._currentPageNumber - 1; // Workers use 0-indexed

    if (this._pdfWorker) {
      this._sendMessageToWorker(this._pdfWorker, "renderPage", {
        pageNumber: pageNumToRender,
        scale: this._currentScale,
        documentId: this._currentDocumentId,
      });
    } else {
      this._handleError("PDF worker not initialized");
      this._isLoading = false;
    }
  }

  private _drawPageToCanvas(
    pixelDataBuffer: ArrayBuffer,
    width: number,
    height: number,
  ) {
    if (!this._canvas || !this._canvasContext) {
      this._handleError("Canvas not initialized");
      return;
    }

    try {
      const imageData = new ImageData(
        new Uint8ClampedArray(pixelDataBuffer),
        width,
        height,
      );

      this._canvas.width = width;
      this._canvas.height = height;
      this._canvasContext.clearRect(0, 0, width, height);
      this._canvasContext.putImageData(imageData, 0, 0);
    } catch (error) {
      this._handleError(
        `Failed to draw to canvas: ${(error as Error).message}`,
      );
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Worker message data has dynamic shape
  private _handleWorkerMessage(data: any, workerName: string) {
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
          console.log("PDFium initialization complete");
          this._isInitialized = true;

          if (this._pendingFileLoad) {
            console.log("Processing pending file load");
            this._loadFile(this._pendingFileLoad.source);
            this._pendingFileLoad = null;
          }
        }
        break;

      case "pdfLoaded":
        if (success) {
          this._totalPages = data.pageCount;
          this._currentDocumentId = data.documentId;
          this._isLoading = false;
          // Trigger initial page render
          this._renderCurrentPage();
        } else {
          this._handleError("Failed to load PDF");
        }
        break;

      case "pageRendered":
        if (success && data.imageData) {
          // Store native width (pixel width at the rendered scale) to enable fit-to-view
          if (this._currentScale !== 0) {
            this._nativePageWidth = Math.round(data.width / this._currentScale);
          }
          this._drawPageToCanvas(data.imageData, data.width, data.height);
          this._isLoading = false;

          // On first render after load, apply fit-to-view if enabled
          if (this._isFitToView) {
            this._applyFitToView();
          }
        } else {
          this._handleError("Failed to render page");
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
    this._currentScale = parseFloat(input.value);
    this._isFitToView = false;
    this._renderCurrentPage();
  }

  private _handleFitToView() {
    this._isFitToView = true;
    if (this._nativePageWidth > 0) {
      this._applyFitToView();
    }
  }

  /**
   * Computes and applies a scale so the page fills the content area width.
   * Uses the native page pixel width (at scale=1) for the calculation.
   */
  private _applyFitToView() {
    if (!this._contentArea || this._nativePageWidth <= 0) return;
    const containerWidth = this._contentArea.clientWidth - 32; // 1rem padding each side
    const newScale = Math.max(
      0.5,
      Math.min(3, containerWidth / this._nativePageWidth),
    );
    this._currentScale = Math.round(newScale * 100) / 100;
    this._renderCurrentPage();
  }

  render() {
    const zoomPercent = Math.round(this._currentScale * 100);
    const canNav = this._totalPages > 0 && !this._isLoading;

    return html`
      <div class="viewer-container">
        <main class="content-area">
          <canvas id="viewerCanvas"></canvas>
          ${this._isLoading
            ? html`<div class="status-overlay">
                <div class="message">
                  <div class="loader"></div>
                  <p>Loading…</p>
                </div>
              </div>`
            : ""}
          ${this._errorMessage
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
            : ""}
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
              ?disabled=${this._currentPageNumber >= this._totalPages ||
              !canNav}
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
                .value=${this._currentScale.toString()}
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
