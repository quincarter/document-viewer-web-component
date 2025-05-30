import { CbzViewer } from "./CbzViewer";

customElements.get("cbz-viewer") ||
  customElements.define("cbz-viewer", CbzViewer);
