import { CbzViewer } from "./CbzViewer";

customElements.get("cbz-viewer") ||
	customElements.define("cbz-viewer", CbzViewer);

export { CbzControls } from "./cbz-controls";
export { CbzViewerStyles } from "./cbz-viewer.styles";
export * from "./interfaces";
export { CbzViewer };
