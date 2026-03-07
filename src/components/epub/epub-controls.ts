import { EpubControls } from "./EpubControls";

customElements.get("epub-controls") ||
  customElements.define("epub-controls", EpubControls);

export { EpubControls };
export { EpubConrolsStyles } from "./epub-controls.styles";
