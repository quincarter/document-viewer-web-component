import { html } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fixture, fixtureCleanup } from "./helpers/index";

vi.mock("epubjs", () => ({
	default: vi.fn(() => ({
		ready: Promise.resolve(),
		spine: { each: vi.fn() },
		navigation: { toc: [] },
		renderTo: vi.fn(() => ({
			display: vi.fn().mockResolvedValue(undefined),
			next: vi.fn().mockResolvedValue(undefined),
			prev: vi.fn().mockResolvedValue(undefined),
			destroy: vi.fn(),
			themes: { register: vi.fn(), default: vi.fn(), select: vi.fn() },
			location: null,
			on: vi.fn(),
		})),
		destroy: vi.fn(),
	})),
}));

import type { DocumentRouter } from "../src/components/document-viewer";
import type { MyElement } from "../src/my-element";
import "../src/my-element";

afterEach(() => fixtureCleanup());

describe("my-element", () => {
	it("is defined as a custom element", () => {
		expect(customElements.get("my-element")).to.exist;
	});

	it("renders with default empty src", async () => {
		const el = await fixture<MyElement>(html`<my-element></my-element>`);
		expect(el.src).to.equal("");
	});

	it("creates a document-viewer child", async () => {
		const el = await fixture<MyElement>(html`<my-element></my-element>`);

		const viewer = el.shadowRoot?.querySelector("document-viewer");
		expect(viewer).to.exist;
	});

	it("passes src property to document-viewer", async () => {
		const el = await fixture<MyElement>(
			html`<my-element .src=${"test.pdf"}></my-element>`,
		);

		const viewer = el.shadowRoot?.querySelector(
			"document-viewer",
		) as DocumentRouter;
		expect(viewer).to.exist;
		expect(viewer.src).to.equal("test.pdf");
	});

	it("has correct host styles", async () => {
		const el = await fixture<MyElement>(html`<my-element></my-element>`);

		const styles = getComputedStyle(el);
		expect(styles.display).to.equal("block");
	});

	it("updates document-viewer src when property changes", async () => {
		const el = await fixture<MyElement>(
			html`<my-element .src=${"initial.pdf"}></my-element>`,
		);

		el.src = "updated.epub";
		await el.updateComplete;

		const viewer = el.shadowRoot?.querySelector(
			"document-viewer",
		) as DocumentRouter;
		expect(viewer.src).to.equal("updated.epub");
	});
});
