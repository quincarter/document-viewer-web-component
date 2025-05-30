import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { PopoverMenuStyles } from "./popover-menu.styles";

@customElement("popover-menu")
export class PopoverMenu extends LitElement {
  static styles = [PopoverMenuStyles];

  @property({ type: Boolean, reflect: true })
  open = false;

  @property({ type: String })
  position: "top" | "bottom" | "left" | "right" = "bottom";

  @property({ type: String })
  alignment: "start" | "end" = "end";

  private _togglePopover() {
    this.open = !this.open;
    this.dispatchEvent(
      new CustomEvent("popover-toggle", {
        detail: { open: this.open },
        bubbles: true,
        composed: true,
      })
    );
  }

  closePopover() {
    if (this.open) {
      this.open = false;
      this.dispatchEvent(
        new CustomEvent("popover-toggle", {
          detail: { open: false },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  render() {
    return html`
      <div class="trigger" @click=${this._togglePopover}>
        <slot name="trigger"></slot>
      </div>
      <div
        class="popover ${this.open ? "visible" : ""} ${this.position} ${this
          .alignment}"
      >
        <slot></slot>
      </div>
    `;
  }
}
