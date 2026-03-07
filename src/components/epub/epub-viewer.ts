import { EpubViewer } from "./EpubViewer";

customElements.get("epub-viewer") ||
	customElements.define("epub-viewer", EpubViewer);

export { EpubViewer };
export { EpubControls } from "./epub-controls";
export { EpubViewerStyles } from "./epub-viewer.styles";
export {
	type EpubFlowType,
	EpubManager,
	type EpubViewerSettings,
	loadSettings,
	type NavItem,
	type RenditionOptions,
	saveSettings,
} from "./utils/epub-utils";
