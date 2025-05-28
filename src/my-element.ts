import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./components/document-viewer";
/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement("my-element")
export class MyElement extends LitElement {
  /**
   * Copy for the read the docs hint.
   */
  @property()
  docsHint = "Click on the Vite and Lit logos to learn more";

  /**
   * The string of the document to be displayed.
   */
  @property({ type: String })
  src = "";

  render() {
    return html` <document-viewer src="${this.src}"> </document-viewer> `;
  }

  static styles = css``;
}

declare global {
  interface HTMLElementTagNameMap {
    "my-element": MyElement;
  }
}
