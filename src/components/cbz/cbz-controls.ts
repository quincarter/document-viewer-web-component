import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { CbzControlsStyles } from "./cbz-controls.styles";

@customElement("cbz-controls")
export class CbzControls extends LitElement {
  static styles = [CbzControlsStyles];

  @property({ type: Number })
  currentPage: number = 1;

  @property({ type: Number })
  totalPages: number = 0;

  @property({ type: Boolean })
  isDualPage: boolean = false;

  private _handleDualPageToggle() {
    this.isDualPage = !this.isDualPage;
    this.dispatchEvent(
      new CustomEvent("view-mode-changed", {
        detail: { isDualPage: this.isDualPage },
        bubbles: true,
        composed: true,
      })
    );
  }

  protected render() {
    return html`
      <div class="page-info">Page ${this.currentPage} / ${this.totalPages}</div>
      <button
        @click=${this._handleDualPageToggle}
        title=${this.isDualPage ? "Single Page View" : "Dual Page View"}
      >
        ${this.isDualPage
          ? html`<svg viewBox="0 0 24 24">
              <path
                d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9s9-4.03 9-9s-4.03-9-9-9zm0 16c-3.86 0-7-3.14-7-7s3.14-7 7-7s7 3.14 7 7s-3.14 7-7 7z"
              />
              <path
                d="M12 17c2.76 0 5-2.24 5-5s-2.24-5-5-5s-5 2.24-5 5s2.24 5 5 5zm0-8c1.65 0 3 1.35 3 3s-1.35 3-3 3s-3-1.35-3-3s1.35-3 3-3z"
              />
            </svg>`
          : html`<svg viewBox="0 0 24 24">
              <path
                d="M6 3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H6zm0 2h12v14H6V5z"
              />
              <path d="M12 5v14" />
            </svg>`}
        ${this.isDualPage ? "Single Page" : "Dual Page"}
      </button>
    `;
  }
}
