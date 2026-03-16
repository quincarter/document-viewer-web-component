import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { afterEach, describe, expect, it } from "vitest";
import { fixture, fixtureCleanup } from "./helpers/index";

@customElement("test-decorator-el")
class TestDecoratorEl extends LitElement {
	@property({ type: String })
	name = "world";

	render() {
		return html`<p>Hello ${this.name}</p>`;
	}
}

afterEach(() => fixtureCleanup());

describe("decorator test", () => {
	it("works with decorators", async () => {
		const el = await fixture<TestDecoratorEl>(
			html`<test-decorator-el></test-decorator-el>`,
		);
		expect(el).to.exist;
		expect(el.name).to.equal("world");
	});
});
