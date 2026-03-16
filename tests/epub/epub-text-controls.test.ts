import { html } from "lit";
import { afterEach, describe, expect, it } from "vitest";
import type { EpubTextControls } from "../../src/components/epub/epub-text-controls";
import { fixture, fixtureCleanup } from "../helpers/index";
import "../../src/components/epub/epub-text-controls";

afterEach(() => fixtureCleanup());

describe("epub-text-controls", () => {
	it("is defined as a custom element", () => {
		expect(customElements.get("epub-text-controls")).to.exist;
	});

	it("renders with default properties", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls></epub-text-controls>`,
		);

		expect(el.fontSize).to.equal(100);
		expect(el.theme).to.equal("light");
		expect(el.flowType).to.equal("paginated");
		expect(el.supportsDualPage).to.be.false;
		expect(el.isDualPage).to.be.false;
	});

	it("renders font size slider", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls></epub-text-controls>`,
		);

		const slider = el.shadowRoot?.querySelector('input[type="range"]');
		expect(slider).to.exist;
		expect((slider as HTMLInputElement).min).to.equal("80");
		expect((slider as HTMLInputElement).max).to.equal("160");
	});

	it("renders font size value display", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls .fontSize=${120}></epub-text-controls>`,
		);

		const valueDisplay = el.shadowRoot?.querySelector(".font-size-value");
		expect(valueDisplay).to.exist;
		expect(valueDisplay?.textContent).to.include("120%");
	});

	it("renders theme buttons", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls></epub-text-controls>`,
		);

		const themeButtons = el.shadowRoot?.querySelectorAll(".theme-button");
		expect(themeButtons.length).to.equal(3);

		const labels = Array.from(themeButtons).map((b) => b.textContent?.trim());
		expect(labels).to.include("Light");
		expect(labels).to.include("Dark");
		expect(labels).to.include("Sepia");
	});

	it("highlights active theme", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls .theme=${"dark"}></epub-text-controls>`,
		);

		const darkButton = el.shadowRoot?.querySelector(".theme-button.dark");
		expect(darkButton?.classList.contains("active-theme")).to.be.true;

		const lightButton = el.shadowRoot?.querySelector(".theme-button.light");
		expect(lightButton?.classList.contains("active-theme")).to.be.false;
	});

	it("renders layout buttons", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls></epub-text-controls>`,
		);

		const buttons = el.shadowRoot?.querySelectorAll(".button-group button");
		// Should have paginated and scrollable buttons
		const labels = Array.from(buttons).map((b) => b.textContent?.trim());
		expect(labels).to.include("Paginated");
		expect(labels).to.include("Scrollable");
	});

	it("highlights active layout", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls .flowType=${"paginated"}></epub-text-controls>`,
		);

		const buttons = el.shadowRoot?.querySelectorAll(".button-group button");
		const paginatedBtn = Array.from(buttons).find(
			(b) => b.textContent?.trim() === "Paginated",
		);
		expect(paginatedBtn?.classList.contains("active")).to.be.true;
	});

	it("dispatches font-size-changed event", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls></epub-text-controls>`,
		);

		let eventDetail: { fontSize: number } | null = null;
		el.addEventListener("font-size-changed", ((e: CustomEvent) => {
			eventDetail = e.detail;
		}) as EventListener);

		const slider = el.shadowRoot?.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		slider.value = "120";
		slider.dispatchEvent(new Event("input"));

		expect(eventDetail).to.not.be.null;
		expect(eventDetail?.fontSize).to.equal(120);
	});

	it("dispatches theme-changed event", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls></epub-text-controls>`,
		);

		let eventDetail: { theme: string } | null = null;
		el.addEventListener("theme-changed", ((e: CustomEvent) => {
			eventDetail = e.detail;
		}) as EventListener);

		const darkButton = el.shadowRoot?.querySelector(
			".theme-button.dark",
		) as HTMLElement;
		darkButton.click();

		expect(eventDetail).to.not.be.null;
		expect(eventDetail?.theme).to.equal("dark");
	});

	it("dispatches flow-type-changed event", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls></epub-text-controls>`,
		);

		let eventDetail: { flowType: string } | null = null;
		el.addEventListener("flow-type-changed", ((e: CustomEvent) => {
			eventDetail = e.detail;
		}) as EventListener);

		const buttons = el.shadowRoot?.querySelectorAll(".button-group button");
		const scrollableBtn = Array.from(buttons).find(
			(b) => b.textContent?.trim() === "Scrollable",
		) as HTMLElement;
		scrollableBtn.click();

		expect(eventDetail).to.not.be.null;
		expect(eventDetail?.flowType).to.equal("scrolled-continuous");
	});

	it("does not show view mode buttons when supportsDualPage is false", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls
        .supportsDualPage=${false}
      ></epub-text-controls>`,
		);

		const headings = el.shadowRoot?.querySelectorAll("h3");
		const viewModeHeading = Array.from(headings).find(
			(h) => h.textContent === "View Mode",
		);
		expect(viewModeHeading).to.be.undefined;
	});

	it("shows view mode buttons when supportsDualPage is true", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls .supportsDualPage=${true}></epub-text-controls>`,
		);

		const headings = el.shadowRoot?.querySelectorAll("h3");
		const viewModeHeading = Array.from(headings).find(
			(h) => h.textContent === "View Mode",
		);
		expect(viewModeHeading).to.exist;
	});

	it("dispatches view-mode-changed event", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls
        .supportsDualPage=${true}
        .isDualPage=${false}
      ></epub-text-controls>`,
		);

		let eventDetail: { isDualPage: boolean } | null = null;
		el.addEventListener("view-mode-changed", ((e: CustomEvent) => {
			eventDetail = e.detail;
		}) as EventListener);

		const buttons = el.shadowRoot?.querySelectorAll(".button-group button");
		const dualPageBtn = Array.from(buttons).find(
			(b) => b.textContent?.trim() === "Dual Page",
		) as HTMLElement;
		dualPageBtn.click();

		expect(eventDetail).to.not.be.null;
		expect(eventDetail?.isDualPage).to.be.true;
	});

	it("font-size-changed event bubbles and is composed", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls></epub-text-controls>`,
		);

		let event: CustomEvent | null = null;
		el.addEventListener("font-size-changed", ((e: CustomEvent) => {
			event = e;
		}) as EventListener);

		const slider = el.shadowRoot?.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		slider.value = "110";
		slider.dispatchEvent(new Event("input"));

		expect(event).to.not.be.null;
		expect(event?.bubbles).to.be.true;
		expect(event?.composed).to.be.true;
	});

	it("updates fontSize property when slider changes", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls .fontSize=${100}></epub-text-controls>`,
		);

		const slider = el.shadowRoot?.querySelector(
			'input[type="range"]',
		) as HTMLInputElement;
		slider.value = "140";
		slider.dispatchEvent(new Event("input"));

		expect(el.fontSize).to.equal(140);
	});

	it("updates theme property when theme button clicked", async () => {
		const el = await fixture<EpubTextControls>(
			html`<epub-text-controls .theme=${"light"}></epub-text-controls>`,
		);

		const sepiaButton = el.shadowRoot?.querySelector(
			".theme-button.sepia",
		) as HTMLElement;
		sepiaButton.click();

		expect(el.theme).to.equal("sepia");
	});
});
