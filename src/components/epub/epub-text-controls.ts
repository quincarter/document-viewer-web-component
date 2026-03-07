import { EpubTextControls } from "./EpubTextControls";

customElements.get("epub-text-controls") ||
  customElements.define("epub-text-controls", EpubTextControls);

export { EpubTextControls };
