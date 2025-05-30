import { CbzViewer } from "./CbzViewer";

customElements.get("cbz-viewer") ||
  customElements.define("cbz-viewer", CbzViewer);
export { CbzViewer };
export { CbzViewerStyles } from "./cbz-viewer.styles";
export { CbzControls } from "./cbz-controls";
export * from "./interfaces";
