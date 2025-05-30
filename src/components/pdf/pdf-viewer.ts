import { PdfViewer } from "./PdfViewer";

customElements.get("pdf-viewer") ||
  customElements.define("pdf-viewer", PdfViewer);
