// src/document-viewer.ts
import { LitElement, html, css, type PropertyValueMap } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";

// Import worker instances (Vite inline worker syntax)
import PdfWorker from "./workers/pdf.worker.ts?worker&inline";

// Import WASM URLs (Vite syntax)
import pdfiumWasmUrl from "@hyzyla/pdfium/pdfium.wasm?url";
import { PdfViewerStyles } from "./pdf-viewer.styles";

interface DocumentWorker extends Worker {
  postMessage(message: any, transfer: Transferable[]): void;
  postMessage(message: any, options?: StructuredSerializeOptions): void;
}

@customElement("pdf-viewer")
export class DocumentViewer extends LitElement {
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
  private _currentScale: number = 1.5;
  @state()
  private _currentDocumentId: string | null = null; // To correlate worker responses
  @state()
  private _isInitialized: boolean = false;

  @query("#viewerCanvas")
  private _canvas!: HTMLCanvasElement;
  private _canvasContext!: CanvasRenderingContext2D | null;

  private _pdfWorker!: DocumentWorker | null;
  private _workerMessageIdCounter = 0;
  private _pendingWorkerMessages = new Map<number, (value: any) => void>();
  private _pendingFileLoad: { source: string | File } | null = null;

  static styles = [PdfViewerStyles];

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
    console.log("Loading WASM from:", wasmUrl);

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
    this._pdfWorker?.terminate();
    this._pdfWorker = null;
    this._pendingWorkerMessages.forEach((resolve) =>
      resolve({ type: "error", message: "Worker terminated" })
    );
    this._pendingWorkerMessages.clear();
  }

  protected firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    if (this._canvas) {
      this._canvasContext = this._canvas.getContext("2d");
    } else {
      console.error("PDF Viewer: Canvas element not found.");
      this._errorMessage = "Canvas element could not be initialized.";
    }

    if (this.src) {
      this._loadFile(this.src);
    }
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
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
        this._canvas.height
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
    height: number
  ) {
    if (!this._canvas || !this._canvasContext) {
      this._handleError("Canvas not initialized");
      return;
    }

    try {
      const imageData = new ImageData(
        new Uint8ClampedArray(pixelDataBuffer),
        width,
        height
      );

      this._canvas.width = width;
      this._canvas.height = height;
      this._canvasContext.clearRect(0, 0, width, height);
      this._canvasContext.putImageData(imageData, 0, 0);
    } catch (error) {
      this._handleError(
        `Failed to draw to canvas: ${(error as Error).message}`
      );
    }
  }

  private _handleWorkerMessage(data: any, workerName: string) {
    const { type, success, messageId } = data;

    if (messageId != null && this._pendingWorkerMessages.has(messageId)) {
      const resolve = this._pendingWorkerMessages.get(messageId)!;
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
          console.log("PDF loaded successfully", data);
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
          console.log(`Page ${this._currentPageNumber} rendered`);
          this._drawPageToCanvas(data.imageData, data.width, data.height);
          this._isLoading = false;
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
      error instanceof ErrorEvent ? error.message : "Worker error occurred"
    );
  }

  private _sendMessageToWorker(
    worker: DocumentWorker,
    type: string,
    payload: any,
    transferList?: Transferable[]
  ): Promise<any> {
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
    if (!isNaN(page) && page >= 1 && page <= this._totalPages) {
      this._currentPageNumber = page;
      this._renderCurrentPage();
    } else {
      input.value = this._currentPageNumber.toString();
    }
  }

  private _handleZoomChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this._currentScale = parseFloat(select.value);
    this._renderCurrentPage();
  }

  render() {
    return html`
      <div class="viewer-container">
        <header>
          <h3>${this.viewerTitle}</h3>
          <div class="controls">
            <button
              @click=${this._goToPreviousPage}
              ?disabled=${this._currentPageNumber <= 1 || this._isLoading}
            >
              &larr; Prev
            </button>
            <span>
              Page
              <input
                type="number"
                .value=${this._currentPageNumber.toString()}
                min="1"
                .max=${this._totalPages.toString()}
                @change=${this._handlePageInputChange}
                ?disabled=${this._totalPages === 0 || this._isLoading}
              />
              of ${this._totalPages || "?"}
            </span>
            <button
              @click=${this._goToNextPage}
              ?disabled=${this._currentPageNumber >= this._totalPages ||
              this._isLoading}
            >
              Next &rarr;
            </button>
            <select
              @change=${this._handleZoomChange}
              .value=${this._currentScale.toString()}
              ?disabled=${this._isLoading}
            >
              <option value="0.5">50%</option>
              <option value="1">100%</option>
              <option value="1.5">150%</option>
              <option value="2">200%</option>
              <option value="2.5">250%</option>
              <option value="3">300%</option>
            </select>
          </div>
        </header>
        <main class="content-area">
          <canvas id="viewerCanvas"></canvas>
          ${this._isLoading
            ? html`<div class="status-overlay">
                <div class="message">
                  <div class="loader"></div>
                  <p>Loading...</p>
                </div>
              </div>`
            : ""}
          ${this._errorMessage
            ? html`<div class="status-overlay">
                <div class="message error-message">
                  <p>Error: ${this._errorMessage}</p>
                  <button
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
      </div>
    `;
  }
}
