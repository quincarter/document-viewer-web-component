import { MyElement } from "./MyElement";

customElements.get("my-element") ||
  customElements.define("my-element", MyElement);

export { MyElement };
