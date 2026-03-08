import { html, LitElement } from "lit";
import { property, query, state } from "lit/decorators.js";
import "./epub-controls";
import { EpubViewerStyles } from "./epub-viewer.styles";
import type {
  EpubFlowType,
  EpubViewerSettings,
  NavItem,
} from "./utils/epub-utils";
import { EpubManager, loadSettings, saveSettings } from "./utils/epub-utils";

export class EpubViewer extends LitElement {
  @property({ type: String })
  src: string | null = null;

  static styles = [EpubViewerStyles];

  @query(".epub-container") private bookContainer!: HTMLElement;
  @state() private isLoading: boolean = false;
  @state() private error: string | null = null;
  @state() private toc: NavItem[] = [];
  @state() private totalPages: number = 0;
  @state() private currentPage: number = 1;
  @state() private flowType: EpubFlowType = "paginated";
  @state() private controlsPinned: boolean = false;
  @state() private fontSize: number = 100;
  @state() private theme: "light" | "dark" | "sepia" = "light";
  private epubManager: EpubManager;

  constructor() {
    super();
    this.epubManager = new EpubManager();
    const settings = loadSettings();
    this.fontSize = settings.fontSize;
    this.theme = settings.theme;
    this.flowType = settings.flowType;
  }

  render() {
    return html`
      <div
        class="content-container ${this.isLoading ? "loading" : ""} ${this
          .flowType !== "paginated"
          ? "scrolled"
          : ""} theme-${this.theme}"
      >
        ${this.error
          ? html`<div class="error">${this.error}</div>`
          : html`
              <epub-controls
                @controls-pinned-changed=${this._handlePinnedChange}
                @flow-type-changed=${this._handleFlowTypeChange}
                @font-size-changed=${this._handleFontSizeChange}
                @theme-changed=${this._handleThemeChange}
                @prev-page=${this._prevPage}
                @next-page=${this._nextPage}
                .totalPages=${this.totalPages}
                .currentPage=${this.currentPage}
                .fontSize=${this.fontSize}
                .theme=${this.theme}
                .flowType=${this.flowType}
              >
                <div class="epub-container"></div>
              </epub-controls>
            `}
      </div>
    `;
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("src") && this.src) {
      this.loadEpubDocument();
    }
  }

  private _handlePinnedChange(e: CustomEvent) {
    this.controlsPinned = e.detail.pinned;
    console.log(`Controls pinned state changed: ${this.controlsPinned}`);
  }

  /**
   * Fired by epubjs whenever the visible spine item changes.
   * Used to track the current page in scroll modes (replaces the broken
   * DOM-scroll listener approach: `scroll` events don't bubble, so listening
   * on bookContainer never fires for epubjs's inner views container).
   */
  // biome-ignore lint/suspicious/noExplicitAny: epubjs location type lacks complete typings
  private _onEpubRelocated = (location: any) => {
    if (this.flowType === "paginated") return; // paginated handled by _prevPage/_nextPage
    const spineIndex: number = location?.start?.index ?? 0;
    const newPage = spineIndex + 1;
    if (newPage !== this.currentPage) {
      this.currentPage = newPage;
      this._dispatchPageChange();
    }
  };

  /**
   * After epubjs creates its views container (a direct DOM child of
   * bookContainer), set `overflow-anchor: none` on it.
   *
   * Why: when epubjs prepends a previous section above the current scroll
   * position, it manually adjusts `scrollTop` to compensate. The browser's
   * built-in scroll-anchoring *also* adjusts `scrollTop` — the two fight,
   * causing the visible snap-back on scroll-up. Disabling scroll-anchoring
   * on that element lets epubjs be the sole owner of scroll adjustment.
   */
  private _setupScrollModeFixes() {
    const viewsContainer = this.bookContainer?.firstElementChild;
    if (viewsContainer instanceof HTMLElement) {
      viewsContainer.style.overflowAnchor = "none";
    }
  }

  private _handleKeyPress(e: KeyboardEvent) {
    if (this.flowType === "paginated") {
      if (e.key === "ArrowRight") {
        this._nextPage();
      } else if (e.key === "ArrowLeft") {
        this._prevPage();
      }
    } else if (this.flowType === "scrolled-continuous") {
      const scrollAmount = 100; // Pixels to scroll
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        this.bookContainer.scrollBy({ top: scrollAmount, behavior: "smooth" });
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        this.bookContainer.scrollBy({ top: -scrollAmount, behavior: "smooth" });
      }
    }
  }

  protected firstUpdated() {
    // Add keyboard navigation
    this.addEventListener("keydown", this._handleKeyPress.bind(this));

    // Load the book if src is already set
    if (this.src) {
      this.loadEpubDocument();
    }
  }

  private _saveCurrentSettings() {
    const settings: EpubViewerSettings = {
      fontSize: this.fontSize,
      theme: this.theme,
      flowType: this.flowType,
    };
    saveSettings(settings);
  }

  private async _handleFlowTypeChange(e: CustomEvent) {
    const { flowType } = e.detail;

    // Tear down previous scroll tracking before recreating the rendition
    this.epubManager.removeRelocatedListener(this._onEpubRelocated);

    await this.epubManager.setFlowType(flowType, this.bookContainer, {
      width: this.bookContainer.clientWidth,
      height: this.bookContainer.clientHeight,
      flow: flowType,
    });

    this.flowType = flowType;
    this._saveCurrentSettings();

    // Re-attach scroll tracking and apply CSS fixes for non-paginated modes
    if (flowType !== "paginated") {
      this._setupScrollModeFixes();
      this.epubManager.onRelocated(this._onEpubRelocated);
    }
  }

  private async _nextPage() {
    if (this.currentPage < this.totalPages) {
      await this.epubManager.nextPage();
      this.currentPage++;
      this._dispatchPageChange();
    }
  }

  private async _prevPage() {
    if (this.currentPage > 1) {
      await this.epubManager.prevPage();
      this.currentPage--;
      this._dispatchPageChange();
    }
  }

  private _dispatchPageChange() {
    this.dispatchEvent(
      new CustomEvent("page-changed", {
        detail: {
          currentPage: this.currentPage,
          totalPages: this.totalPages,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  async loadEpubDocument(): Promise<void> {
    if (!this.src) return;

    try {
      this.isLoading = true;
      this.error = null;

      const response = await fetch(this.src);
      if (!response.ok) {
        throw new Error(`Failed to fetch EPUB: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const { toc, totalPages } = await this.epubManager.loadBook(buffer);

      this.toc = toc;
      this.totalPages = totalPages;
      this.currentPage = 1;

      // Create rendition after book is loaded
      await this.epubManager.createRendition(this.bookContainer, {
        width: this.bookContainer.clientWidth,
        height: this.bookContainer.clientHeight,
        flow: this.flowType,
      });

      // Apply theme and font size after rendition is created
      this.epubManager.updateTheme(this.theme);
      this.epubManager.updateFontSize(this.fontSize);

      // Set up scroll-mode fixes for non-paginated flow types.
      // This must run after createRendition so epubjs has inserted its
      // views container into bookContainer.
      if (this.flowType !== "paginated") {
        this._setupScrollModeFixes();
        this.epubManager.onRelocated(this._onEpubRelocated);
      }

      this.dispatchEvent(
        new CustomEvent("epub-loaded", {
          detail: { totalPages: this.totalPages },
        }),
      );
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      this.dispatchEvent(
        new CustomEvent("epub-error", {
          detail: { error: this.error },
        }),
      );
    } finally {
      this.isLoading = false;
    }
  }

  private _handleFontSizeChange(e: CustomEvent) {
    const { fontSize } = e.detail;
    this.fontSize = fontSize;
    this.epubManager.updateFontSize(fontSize);
    this._saveCurrentSettings();
  }

  private _handleThemeChange(e: CustomEvent) {
    const { theme } = e.detail;
    this.theme = theme;
    this.epubManager.updateTheme(theme);
    this._saveCurrentSettings();
  }

  get currentPageNumber(): number {
    return this.currentPage;
  }

  get totalPageCount(): number {
    return this.totalPages;
  }

  get tableOfContents(): NavItem[] {
    return [...this.toc];
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.epubManager.removeRelocatedListener(this._onEpubRelocated);
    if (this.epubManager) {
      this.epubManager.destroy();
    }
  }
}
