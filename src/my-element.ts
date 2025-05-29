import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./components/document-viewer";

/**
 * A smart document viewer that supports multiple file formats.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement("my-element")
export class MyElement extends LitElement {
  /**
   * The URL or File object of the document to be displayed.
   */
  @property({ type: String })
  src = "";

  render() {
    return html`<document-viewer .src=${this.src}></document-viewer>`;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "my-element": MyElement;
  }
}
