import { DocumentRouter } from "./DocumentRouter";

customElements.get("document-viewer") ||
	customElements.define("document-viewer", DocumentRouter);

export { DocumentViewerStyles } from "./document-viewer.styles";
export { DocumentRouter };
