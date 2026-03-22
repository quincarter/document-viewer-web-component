// src/components/common/BaseDocumentViewer.ts

import { html, LitElement, type PropertyValueMap } from "lit";
import { property, query, state } from "lit/decorators.js";
import { ViewerControlsSharedStyles } from "./viewer-controls.styles";

export abstract class BaseDocumentViewer extends LitElement {
	@property({ type: String })
	src: string | File | null = null;

	@property({ type: String })
	viewerTitle = "Document Viewer";

	@state()
	protected _isLoading = false;

	@state()
	protected _errorMessage: string | null = null;

	@state()
	protected _currentPageNumber = 1; // 1-indexed for UI

	@state()
	protected _totalPages = 0;

	@state()
	protected _currentScale = 1.0; // The scale at which the worker rendered the current bitmap

	@state()
	protected _displayScale = 1.0; // The scale currently applied via CSS

	@state()
	protected _isFitToView = true;

	@state()
	protected _isInitialized = false;

	@state()
	protected _originalPageWidth = 0;

	@state()
	protected _originalPageHeight = 0;

	@query("#viewerCanvas")
	protected _canvas!: HTMLCanvasElement;

	@query(".content-area")
	protected _contentArea!: HTMLElement;

	protected _resizeObserver: ResizeObserver | null = null;
	protected _zoomDebounceTimer: number | null = null;

	static styles = [ViewerControlsSharedStyles];

	connectedCallback() {
		super.connectedCallback();
	}

	disconnectedCallback() {
		super.disconnectedCallback();
		this._resizeObserver?.disconnect();
		this._resizeObserver = null;
		if (this._zoomDebounceTimer) {
			window.clearTimeout(this._zoomDebounceTimer);
			this._zoomDebounceTimer = null;
		}
	}

	protected firstUpdated(
		_changedProperties: PropertyValueMap<this> | Map<PropertyKey, unknown>,
	): void {
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

	protected abstract _loadFile(source: string | File): Promise<void>;
	protected abstract _renderCurrentPage(): void;
	protected abstract _handleZoomChange(newScale: number): void;
	protected abstract _handleFitToViewChange(
		fitMode: "page",
		containerWidth: number,
		containerHeight: number,
	): void;

	protected _resetViewerState() {
		this._errorMessage = null;
		this._currentPageNumber = 1;
		this._totalPages = 0;
		this._currentScale = 1.0;
		this._displayScale = 1.0;
		this._isFitToView = true;
	}

	protected _handleError(message: string) {
		this._errorMessage = message;
		this._isLoading = false;
		console.error(`${this.viewerTitle} Error:`, message);
	}

	protected _goToPreviousPage() {
		if (this._currentPageNumber > 1) {
			this._currentPageNumber--;
			this._originalPageWidth = 0;
			this._originalPageHeight = 0;
			this._renderCurrentPage();
		}
	}

	protected _goToNextPage() {
		if (this._currentPageNumber < this._totalPages) {
			this._currentPageNumber++;
			this._originalPageWidth = 0;
			this._originalPageHeight = 0;
			this._renderCurrentPage();
		}
	}

	protected _handlePageInputChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const page = parseInt(input.value, 10);
		if (!Number.isNaN(page) && page >= 1 && page <= this._totalPages) {
			if (this._currentPageNumber !== page) {
				this._currentPageNumber = page;
				this._originalPageWidth = 0;
				this._originalPageHeight = 0;
				this._renderCurrentPage();
			}
		} else {
			input.value = this._currentPageNumber.toString();
		}
	}

	protected _handleZoomSliderChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const newScale = parseFloat(input.value);
		this._isFitToView = false;
		this._displayScale = newScale;

		// Debounce high-quality re-render
		if (this._zoomDebounceTimer) {
			window.clearTimeout(this._zoomDebounceTimer);
		}

		this._zoomDebounceTimer = window.setTimeout(() => {
			this._handleZoomChange(newScale);
			this._zoomDebounceTimer = null;
		}, 150);
	}

	protected _handleFitToView() {
		this._isFitToView = true;
		this._applyFitToView(true); // immediate if user clicked
	}

	protected _applyFitToView(immediate = false) {
		if (!this._contentArea || !this._originalPageWidth || !this._originalPageHeight) return;

		const containerWidth = this._contentArea.clientWidth - 32; // 1rem padding each side
		const containerHeight = this._contentArea.clientHeight - 32;

		const scaleWidth = containerWidth / this._originalPageWidth;
		const scaleHeight = containerHeight / this._originalPageHeight;

		const newScale = Math.max(
			0.5,
			Math.min(3, Math.min(scaleWidth, scaleHeight)),
		);
		this._displayScale = newScale;

		const requestZoom = () => {
			this._handleFitToViewChange("page", containerWidth, containerHeight);
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

	protected renderToolbar() {
		const zoomPercent = Math.round(this._displayScale * 100);
		const canNav = this._totalPages > 0 && !this._isLoading;

		return html`
      <div class="toolbar-wrap">
        <div class="ctrl-bar">
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

          <button
            class="ctrl-btn icon-only"
            title="Next page"
            @click=${this._goToNextPage}
            ?disabled=${this._currentPageNumber >= this._totalPages || !canNav}
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </button>

          <div class="ctrl-divider"></div>

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
    `;
	}

	protected renderStatus() {
		return html`
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
    `;
	}

	render() {
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
          ${this.renderStatus()}
        </main>
        ${this.renderToolbar()}
      </div>
    `;
	}
}
