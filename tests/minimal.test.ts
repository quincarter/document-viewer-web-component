import { describe, it, expect, afterEach } from "vitest";
import { html, LitElement } from "lit";
import { fixture, fixtureCleanup } from "./helpers/index";

class TestEl extends LitElement {
  render() {
    return html`<p>Hello</p>`;
  }
}
customElements.define("test-el", TestEl);

afterEach(() => fixtureCleanup());

describe("minimal test", () => {
  it("works", async () => {
    const el = await fixture(html`<test-el></test-el>`);
    expect(el).to.exist;
  });
});
