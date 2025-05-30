import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { CbzViewerStyles } from "./cbz-viewer.styles";
// Using CustomEvent for view mode changes
import "./cbz-controls";

// Import the worker using Vite's inline syntax
import CbzWorker from "./workers/cbz.worker?worker&inline";

export class CbzViewer extends LitElement {
  static styles = [CbzViewerStyles];

  @property({ type: String })
  src?: string;

  @state() private _currentPage: number = 1;
  @state() private _totalPages: number = 0;
  @state() private _loading: boolean = true;
  @state() private _error: string | null = null;
  @state() private _currentDocumentId: string | null = null;
  @state() private _isDualPage: boolean = false;
  private _cbzWorker: Worker | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;
  private _resizeObserver: ResizeObserver | null = null;

  constructor() {
    super();
    this._initializeWorker();
  }

  private _initializeWorker() {
    try {
      this._cbzWorker = new CbzWorker();
      this._cbzWorker.onmessage = this._handleWorkerMessage.bind(this);
      this._cbzWorker.onerror = (error) => {
        console.error("CBZ worker error:", error);
        this._handleError("CBZ worker encountered an error.");
      };
      this._cbzWorker.postMessage({ type: "init" });
    } catch (error) {
      console.error("Failed to initialize CBZ worker:", error);
      this._handleError("Failed to initialize CBZ viewer.");
    }
  }

  private async _loadDocument() {
    if (!this.src || !this._cbzWorker) {
      console.error("Cannot load document:", {
        hasSrc: !!this.src,
        hasWorker: !!this._cbzWorker,
      });
      return;
    }

    this._loading = true;
    this._error = null;

    try {
      const response = await fetch(this.src);
      if (!response.ok)
        throw new Error(`Failed to fetch CBZ file: ${response.statusText}`);

      const archiveBuffer = await response.arrayBuffer();

      this._cbzWorker.postMessage(
        {
          type: "loadCbz",
          payload: {
            archiveBuffer,
            documentId: `cbz-doc-${Date.now()}`,
          },
        },
        [archiveBuffer]
      );
    } catch (error) {
      console.error("Error loading CBZ:", error);
      this._handleError("Failed to load CBZ file.");
    }
  }

  private _handleWorkerMessage(event: MessageEvent) {
    const { type, success, message, ...data } = event.data;

    if (!success) {
      console.error("Worker message failed:", message);
      this._handleError(message || "An error occurred in the CBZ viewer.");
      return;
    }

    switch (type) {
      case "cbzWorkerInitialized":
        if (this.src) this._loadDocument();
        break;

      case "cbzLoaded":
        this._currentDocumentId = data.documentId;
        this._totalPages = data.totalPages;
        this._loading = false;
        this._renderCurrentPage();
        break;

      case "cbzPageRendered":
        if (data.documentId === this._currentDocumentId) {
          if (data.imageData && data.imageMimeType) {
            const blob = new Blob([data.imageData], {
              type: data.imageMimeType,
            });

            // Try loading as Image first since it's more widely supported
            const img = new Image();
            const url = URL.createObjectURL(blob);
            img.onload = () => {
              // Pass through the isSecondPage flag from the worker
              const isSecondPage = data.payload?.isSecondPage === true;
              this._drawImageToCanvas(img, isSecondPage);
              URL.revokeObjectURL(url);
            };
            img.onerror = (err) => {
              console.error("Error loading image:", err);
              URL.revokeObjectURL(url);
              this._handleError("Failed to display CBZ page image.");
            };
            img.src = url;
          } else {
            console.error("Missing image data in worker message");
            this._handleError("Invalid image data received from worker.");
          }
        }
        break;
    }
  }

  private _handleError(message: string) {
    console.error("CBZ Viewer error:", message);
    this._error = message;
    this._loading = false;
  }

  private async _loadNextPageIfNeeded(currentPage: number) {
    if (!this._cbzWorker || !this._currentDocumentId || !this._isDualPage)
      return;
    if (currentPage === 0) return; // Don't load pair for cover page

    // Handle the special case of last page in an odd-numbered total
    if (currentPage === this._totalPages - 1 && currentPage % 2 === 0) {
      // We're showing the last pair, and there is one more page
      // Only load the final page if it exists
      if (currentPage + 1 < this._totalPages) {
        this._cbzWorker.postMessage({
          type: "renderCbzPage",
          payload: {
            pageNumber: currentPage + 1,
            documentId: this._currentDocumentId,
            isSecondPage: true, // This will be the right page
          },
        });
      }
      return;
    }

    // Normal dual page handling
    if (currentPage % 2 === 1) {
      // We're on an odd index (2nd page), so load the next page to show on the right
      if (currentPage + 1 < this._totalPages) {
        this._cbzWorker.postMessage({
          type: "renderCbzPage",
          payload: {
            pageNumber: currentPage + 1,
            documentId: this._currentDocumentId,
            isSecondPage: true, // This will be the right page
          },
        });
      }
    }
  }

  private _handleViewModeChanged(e: CustomEvent) {
    const { isDualPage } = e.detail;
    this._isDualPage = isDualPage;

    // Adjust current page when switching to dual page mode
    if (isDualPage && this._currentPage > 1) {
      // If we're on an odd page (except cover), decrement to show it on the right
      // with its paired even page on the left
      if (this._currentPage % 2 === 1) {
        this._currentPage--;
      }
    }
    this._renderCurrentPage();
  }

  private _shouldShowSinglePage(pageNumber: number) {
    // Only show single page for:
    // 1. Cover (first page)
    // 2. When dual page mode is off
    return !this._isDualPage || pageNumber === 0;
  }

  private async _renderCurrentPage() {
    if (!this._cbzWorker || !this._currentDocumentId) {
      console.error("Cannot render page");
      return;
    }

    // this._loading = true; // remove to avoid flicker on page change

    const currentPageNumber = this._currentPage - 1; // Convert to 0-based index

    // Request current page (will be drawn on the left in dual mode)
    this._cbzWorker.postMessage({
      type: "renderCbzPage",
      payload: {
        pageNumber: currentPageNumber,
        documentId: this._currentDocumentId,
        isSecondPage: false, // First page is always on the left
      },
    });

    // Load the next page if needed for dual-page mode
    await this._loadNextPageIfNeeded(currentPageNumber);
  }

  private _drawImageToCanvas(img: HTMLImageElement, isSecondPage = false) {
    if (!this._canvas || !this._ctx) return;

    // Get canvas dimensions
    const canvasWidth = this._canvas.width;
    const canvasHeight = this._canvas.height;

    // Only clear the canvas for the first page (left side or single page)
    if (!isSecondPage) {
      this._ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    }

    if (this._shouldShowSinglePage(this._currentPage - 1)) {
      // Single page mode - center in full canvas
      const scale = Math.min(
        canvasWidth / img.naturalWidth,
        canvasHeight / img.naturalHeight
      );
      const dWidth = img.naturalWidth * scale;
      const dHeight = img.naturalHeight * scale;
      const dx = (canvasWidth - dWidth) / 2;
      const dy = (canvasHeight - dHeight) / 2;

      this._ctx.drawImage(img, dx, dy, dWidth, dHeight);
    } else {
      // Dual page mode - pages should touch in the middle
      const halfWidth = canvasWidth / 2;
      const scale = Math.min(
        halfWidth / img.naturalWidth,
        canvasHeight / img.naturalHeight
      );
      const dWidth = img.naturalWidth * scale;
      const dHeight = img.naturalHeight * scale;
      const dy = (canvasHeight - dHeight) / 2;

      // Calculate horizontal position - pages should meet at the center
      const dx = isSecondPage
        ? halfWidth // Right page starts exactly at the middle
        : halfWidth - dWidth; // Left page ends exactly at the middle

      this._ctx.drawImage(img, dx, dy, dWidth, dHeight);
    }

    // All drawing finished
    this._loading = false;
  }

  // Page change is handled by prev/next handlers instead

  private _handleCanvasClick(e: MouseEvent) {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const canvasWidth = this._canvas?.width ?? 0;

    // If clicked on left third, go back
    if (x < canvasWidth / 3) {
      this._handlePrevPage();
    }
    // If clicked on right third, go forward
    else if (x > (canvasWidth * 2) / 3) {
      this._handleNextPage();
    }
  }

  private _handleNextPage() {
    if (this._currentPage < this._totalPages) {
      if (!this._isDualPage) {
        // Single page mode - just increment
        this._currentPage++;
      } else {
        // In dual mode:
        // - If on cover (page 1), move to page 2
        // - Otherwise move forward by 2 pages
        const nextPage = this._currentPage === 1 ? 2 : this._currentPage + 2;

        // Check if we can move forward
        if (nextPage <= this._totalPages) {
          this._currentPage = nextPage;
        } else if (this._currentPage !== this._totalPages) {
          // If we can't move by 2 but aren't on last page,
          // move to last page (for odd-numbered total pages)
          this._currentPage = this._totalPages;
        }
      }

      this._renderCurrentPage();
    }
  }

  private _handlePrevPage() {
    if (this._currentPage > 1) {
      if (!this._isDualPage) {
        // Single page mode - just decrement
        this._currentPage--;
      } else {
        if (
          this._currentPage === this._totalPages &&
          this._totalPages % 2 === 1
        ) {
          // If we're on the last page and total is odd, go back to previous pair
          this._currentPage = this._totalPages - 1;
        } else if (this._currentPage <= 2) {
          // From page 2, go back to cover
          this._currentPage = 1;
        } else {
          // In dual mode, always go back 2 pages to maintain even-odd pairing
          this._currentPage -= 2;
        }
      }

      this._renderCurrentPage();
    }
  }

  protected firstUpdated() {
    // Get canvas and context
    this._canvas = this.shadowRoot?.querySelector("canvas") ?? null;
    this._ctx = this._canvas?.getContext("2d") ?? null;

    // Set up resize observer
    this._resizeObserver = new ResizeObserver(() => {
      if (this._canvas) {
        this._canvas.width = this._canvas.offsetWidth;
        this._canvas.height = this._canvas.offsetHeight;
        this._renderCurrentPage();
      }
    });

    if (this._canvas) {
      this._resizeObserver.observe(this._canvas);
    }
  }

  protected updated(changedProperties: Map<string, any>) {
    if (changedProperties.has("src") && this.src) {
      this._loadDocument();
    }
  }

  protected render() {
    return html`
      <canvas
        class="cbz-canvas"
        @click=${this._handleCanvasClick}
        aria-hidden=${!this._loading && !this._error ? "true" : "false"}
      ></canvas>
      ${this._loading ? html`<div class="loading">Loading...</div>` : nothing}
      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}
      ${!this._loading && !this._error
        ? html`<cbz-controls
            .currentPage=${this._currentPage}
            .totalPages=${this._totalPages}
            .isDualPage=${this._isDualPage}
            @view-mode-changed=${this._handleViewModeChanged}
          ></cbz-controls>`
        : nothing}
    `;
  }
}
