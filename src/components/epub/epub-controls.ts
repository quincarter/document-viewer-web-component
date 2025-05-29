import { LitElement, html } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import type { EpubFlowType } from "./utils/epub-utils";
import { EpubConrolsStyles } from "./epub-controls.styles";
import "../common/popover-menu";
import "./epub-text-controls";

interface PageChangedEvent extends CustomEvent {
  detail: {
    currentPage: number;
    totalPages: number;
  };
}

interface FlowTypeChangedEvent extends CustomEvent {
  detail: {
    flowType: EpubFlowType;
  };
}

@customElement("epub-controls")
export class EpubControls extends LitElement {
  static styles = [EpubConrolsStyles];

  @property({ type: Number })
  totalPages: number = 0;

  @property({ type: Number })
  currentPage: number = 1;

  @state() private showControls: boolean = true;
  @state() private controlsPinned: boolean = false;
  @state() private flowType: EpubFlowType = "paginated";
  @state() private fontSize: number = 100;
  @state() private theme: "light" | "dark" | "sepia" = "light";
  private hideControlsTimer: number | undefined;

  private _onPageChanged = (evt: PageChangedEvent) => {
    const { currentPage, totalPages } = evt.detail;
    this.currentPage = currentPage;
    this.totalPages = totalPages;
  };

  private _onFlowTypeChanged = (evt: FlowTypeChangedEvent) => {
    const { flowType } = evt.detail;
    this.flowType = flowType;
  };

  connectedCallback() {
    super.connectedCallback();
    // Listen for page and flow type changes from the viewer
    this.addEventListener("page-changed", this._onPageChanged as EventListener);
    this.addEventListener(
      "flow-type-changed",
      this._onFlowTypeChanged as EventListener
    );
    this._hideControlsWithDelay();
  }

  disconnectedCallback() {
    if (this.hideControlsTimer) {
      window.clearTimeout(this.hideControlsTimer);
    }
    this.removeEventListener(
      "page-changed",
      this._onPageChanged as EventListener
    );
    this.removeEventListener(
      "flow-type-changed",
      this._onFlowTypeChanged as EventListener
    );
    super.disconnectedCallback();
  }

  private _handleMouseMove(e: MouseEvent) {
    if (this.controlsPinned) return;
    e.stopPropagation();
    this.showControls = true;
    this._resetHideControlsTimer();
  }

  private _handleMouseLeave(e: MouseEvent) {
    if (this.controlsPinned) return;
    e.stopPropagation();
    this._hideControlsWithDelay();
  }

  private _resetHideControlsTimer() {
    if (this.hideControlsTimer) {
      window.clearTimeout(this.hideControlsTimer);
    }
    this._hideControlsWithDelay();
  }

  private _hideControlsWithDelay() {
    this.hideControlsTimer = window.setTimeout(() => {
      this.showControls = false;
    }, 2000);
  }

  private _toggleControlsPin() {
    this.controlsPinned = !this.controlsPinned;
    this.dispatchEvent(
      new CustomEvent("controls-pinned-changed", {
        detail: { pinned: this.controlsPinned },
      })
    );
    if (!this.controlsPinned) {
      this._hideControlsWithDelay();
    }
  }

  private _toggleFlowType() {
    this.flowType = this.flowType === "paginated" ? "scrolled" : "paginated";
    this.dispatchEvent(
      new CustomEvent("flow-type-changed", {
        detail: { flowType: this.flowType },
      })
    );
  }

  private _prevPage() {
    this.dispatchEvent(new CustomEvent("prev-page"));
  }

  private _nextPage() {
    this.dispatchEvent(new CustomEvent("next-page"));
  }

  private _handleFontSizeChange(e: CustomEvent) {
    const { fontSize } = e.detail;
    this.fontSize = fontSize;
    this.dispatchEvent(
      new CustomEvent("font-size-changed", {
        detail: { fontSize },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleThemeChange(e: CustomEvent) {
    const { theme } = e.detail;
    this.theme = theme;
    this.dispatchEvent(
      new CustomEvent("theme-changed", {
        detail: { theme },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleFlowTypeChange(e: CustomEvent) {
    const { flowType } = e.detail;
    this.flowType = flowType;
    this.dispatchEvent(
      new CustomEvent("flow-type-changed", {
        detail: { flowType },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <div class="controls-container">
        <div
          class="controls-overlay ${this.showControls || this.controlsPinned
            ? "visible"
            : ""} ${this.controlsPinned ? "pinned" : ""}"
          @mousemove=${this._handleMouseMove}
          @mouseleave=${this._handleMouseLeave}
        >
          <div class="viewer-controls">
            <button
              class="pin-controls ${this.controlsPinned ? "active" : ""}"
              @click=${this._toggleControlsPin}
              title="Toggle controls visibility"
            >
              ${this.controlsPinned ? "Auto-hide Controls" : "Pin Controls"}
            </button>
            <popover-menu position="bottom" alignment="end">
              <button
                slot="trigger"
                class="text-settings"
                title="Text settings"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M3 7h18M3 12h18M3 17h18" />
                </svg>
              </button>
              <epub-text-controls
                .fontSize=${this.fontSize}
                .theme=${this.theme}
                .flowType=${this.flowType}
                @font-size-changed=${this._handleFontSizeChange}
                @theme-changed=${this._handleThemeChange}
                @flow-type-changed=${this._handleFlowTypeChange}
              ></epub-text-controls>
            </popover-menu>
          </div>
          ${this.flowType === "paginated"
            ? html`
                <div
                  class="nav-area left ${this.currentPage <= 1
                    ? "disabled"
                    : ""}"
                  @click=${this._prevPage}
                >
                  <div class="nav-arrow"></div>
                </div>
                <div
                  class="nav-area right ${this.currentPage >= this.totalPages
                    ? "disabled"
                    : ""}"
                  @click=${this._nextPage}
                >
                  <div class="nav-arrow"></div>
                </div>
              `
            : ""}
        </div>
        <div
          class="content-area ${this.controlsPinned ? "controls-pinned" : ""}"
        >
          <slot></slot>
        </div>
      </div>
    `;
  }
}
