import { EpubViewer } from "./EpubViewer";

customElements.get("epub-viewer") ||
  customElements.define("epub-viewer", EpubViewer);
