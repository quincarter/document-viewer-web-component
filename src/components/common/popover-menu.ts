import { PopoverMenu } from "./PopoverMenu";

customElements.get("popover-menu") ||
	customElements.define("popover-menu", PopoverMenu);

export { PopoverMenuStyles } from "./popover-menu.styles";
export { PopoverMenu };
