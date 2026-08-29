import { CbzControls } from "./CbzControls";

customElements.get("cbz-controls") ||
	customElements.define("cbz-controls", CbzControls);

export { CbzControlsStyles } from "./cbz-controls.styles";
export { CbzControls };
