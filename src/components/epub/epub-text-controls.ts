import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { EpubFlowType } from "./utils/epub-utils";

@customElement("epub-text-controls")
export class EpubTextControls extends LitElement {
  static styles = css`
    :host {
      display: block;
      color: var(--text-color, #333);
    }

    .text-controls {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 280px;
      padding: 8px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .control-group h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted, #666);
    }

    .slider-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .font-size-value {
      min-width: 40px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    input[type="range"] {
      flex: 1;
      height: 4px;
      background: var(--range-background, #ddd);
      border-radius: 2px;
      -webkit-appearance: none;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--range-thumb, #0066cc);
      cursor: pointer;
      border: none;
    }

    .button-group {
      display: flex;
      gap: 8px;
    }

    button {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--button-border, #ddd);
      border-radius: 6px;
      background: var(--button-bg, #fff);
      color: var(--button-text, #333);
      cursor: pointer;
      transition: all 0.2s;
    }

    button:hover {
      background: var(--button-hover-bg, #f5f5f5);
    }

    button.active {
      background: var(--button-active-bg, #0066cc);
      color: var(--button-active-text, #fff);
      border-color: var(--button-active-border, #0052a3);
    }

    .theme-buttons {
      display: flex;
      gap: 8px;
    }

    .theme-button {
      flex: 1;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      text-align: center;
    }

    .theme-button.light {
      background: #fff;
      color: #333;
      border: 1px solid #ddd;
    }

    .theme-button.dark {
      background: #333;
      color: #fff;
      border: 1px solid #666;
    }

    .theme-button.sepia {
      background: #f4ecd8;
      color: #5f4b32;
      border: 1px solid #e0d5b7;
    }

    .active-theme {
      box-shadow: 0 0 0 2px var(--theme-active-outline, #0066cc);
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --text-color: #fff;
        --text-muted: #aaa;
        --range-background: #444;
        --range-thumb: #0088ff;
        --button-border: #444;
        --button-bg: #2d2d2d;
        --button-text: #fff;
        --button-hover-bg: #383838;
        --button-active-bg: #0088ff;
        --button-active-text: #fff;
        --button-active-border: #0066cc;
        --theme-active-outline: #0088ff;
      }
    }
  `;

  @property({ type: Number })
  fontSize: number = 100;

  @property({ type: String })
  theme: "light" | "dark" | "sepia" = "light";

  @property({ type: String })
  flowType: EpubFlowType = "paginated";

  render() {
    return html`
      <div class="text-controls">
        <div class="control-group">
          <h3>Text Size</h3>
          <div class="slider-group">
            <input
              type="range"
              min="80"
              max="160"
              .value=${this.fontSize.toString()}
              @input=${this._handleFontSizeChange}
            />
            <span class="font-size-value">${this.fontSize}%</span>
          </div>
        </div>

        <div class="control-group">
          <h3>Theme</h3>
          <div class="theme-buttons">
            <div
              class="theme-button light ${this.theme === "light"
                ? "active-theme"
                : ""}"
              @click=${() => this._handleThemeChange("light")}
            >
              Light
            </div>
            <div
              class="theme-button dark ${this.theme === "dark"
                ? "active-theme"
                : ""}"
              @click=${() => this._handleThemeChange("dark")}
            >
              Dark
            </div>
            <div
              class="theme-button sepia ${this.theme === "sepia"
                ? "active-theme"
                : ""}"
              @click=${() => this._handleThemeChange("sepia")}
            >
              Sepia
            </div>
          </div>
        </div>

        <div class="control-group">
          <h3>Layout</h3>
          <div class="button-group">
            <button
              class="${this.flowType === "paginated" ? "active" : ""}"
              @click=${() => this._handleFlowTypeChange("paginated")}
            >
              Paginated
            </button>
            <button
              class="${this.flowType === "scrolled-continuous" ? "active" : ""}"
              @click=${() => this._handleFlowTypeChange("scrolled-continuous")}
            >
              Scrollable
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private _handleFontSizeChange(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    this.fontSize = value;
    this.dispatchEvent(
      new CustomEvent("font-size-changed", {
        detail: { fontSize: value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleThemeChange(theme: "light" | "dark" | "sepia") {
    this.theme = theme;
    this.dispatchEvent(
      new CustomEvent("theme-changed", {
        detail: { theme },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleFlowTypeChange(flowType: EpubFlowType) {
    this.flowType = flowType;
    this.dispatchEvent(
      new CustomEvent("flow-type-changed", {
        detail: { flowType },
        bubbles: true,
        composed: true,
      })
    );
  }
}
