import { describe, it, expect, afterEach } from "vitest";
import { html } from "lit";
import { fixture, fixtureCleanup, oneEvent } from "../helpers/index";
import type { EpubControls } from "../../src/components/epub/epub-controls";
import "../../src/components/epub/epub-controls";

afterEach(() => fixtureCleanup());

describe("epub-controls", () => {
  it("is defined as a custom element", () => {
    expect(customElements.get("epub-controls")).to.exist;
  });

  it("renders with default properties", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls></epub-controls>`,
    );

    expect(el.totalPages).to.equal(0);
    expect(el.currentPage).to.equal(1);
    expect(el.supportsDualPage).to.be.false;
    expect(el.isDualPage).to.be.false;
  });

  it("renders controls overlay", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls></epub-controls>`,
    );

    const overlay = el.shadowRoot!.querySelector(".controls-overlay");
    expect(overlay).to.exist;
  });

  it("renders viewer controls with pin button", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls></epub-controls>`,
    );

    const pinButton = el.shadowRoot!.querySelector(".pin-controls");
    expect(pinButton).to.exist;
    expect(pinButton!.textContent).to.include("Pin Controls");
  });

  it("renders text settings button", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls></epub-controls>`,
    );

    const textButton = el.shadowRoot!.querySelector(".text-settings");
    expect(textButton).to.exist;
  });

  it("renders popover-menu with epub-text-controls inside", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls></epub-controls>`,
    );

    const popover = el.shadowRoot!.querySelector("popover-menu");
    expect(popover).to.exist;

    const textControls = el.shadowRoot!.querySelector("epub-text-controls");
    expect(textControls).to.exist;
  });

  it("renders nav areas in paginated mode", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls .totalPages=${10} .currentPage=${5}></epub-controls>`,
    );

    // Flow type defaults to paginated, so nav areas should show
    const navAreas = el.shadowRoot!.querySelectorAll(".nav-area");
    expect(navAreas.length).to.equal(2);

    const leftNav = el.shadowRoot!.querySelector(".nav-area.left");
    const rightNav = el.shadowRoot!.querySelector(".nav-area.right");
    expect(leftNav).to.exist;
    expect(rightNav).to.exist;
  });

  it("disables left nav at first page", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls .totalPages=${10} .currentPage=${1}></epub-controls>`,
    );

    const leftNav = el.shadowRoot!.querySelector(".nav-area.left");
    expect(leftNav!.classList.contains("disabled")).to.be.true;
  });

  it("disables right nav at last page", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls
        .totalPages=${10}
        .currentPage=${10}
      ></epub-controls>`,
    );

    const rightNav = el.shadowRoot!.querySelector(".nav-area.right");
    expect(rightNav!.classList.contains("disabled")).to.be.true;
  });

  it("dispatches prev-page event when left nav clicked", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls .totalPages=${10} .currentPage=${5}></epub-controls>`,
    );

    const listener = oneEvent(el, "prev-page");
    const leftNav = el.shadowRoot!.querySelector(
      ".nav-area.left",
    ) as HTMLElement;
    leftNav.click();
    const event = await listener;
    expect(event).to.exist;
  });

  it("dispatches next-page event when right nav clicked", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls .totalPages=${10} .currentPage=${5}></epub-controls>`,
    );

    const listener = oneEvent(el, "next-page");
    const rightNav = el.shadowRoot!.querySelector(
      ".nav-area.right",
    ) as HTMLElement;
    rightNav.click();
    const event = await listener;
    expect(event).to.exist;
  });

  it("toggles pin state on pin button click", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls></epub-controls>`,
    );

    const pinButton = el.shadowRoot!.querySelector(
      ".pin-controls",
    ) as HTMLElement;

    let eventDetail: { pinned: boolean } | null = null;
    el.addEventListener("controls-pinned-changed", ((e: CustomEvent) => {
      eventDetail = e.detail;
    }) as EventListener);

    pinButton.click();
    await el.updateComplete;

    expect(eventDetail).to.not.be.null;
    expect(eventDetail!.pinned).to.be.true;

    // Pin button text should change
    expect(pinButton.textContent).to.include("Auto-hide Controls");
  });

  it("renders slotted content in content area", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls>
        <div class="test-content">Book content here</div>
      </epub-controls>`,
    );

    const slot = el.shadowRoot!.querySelector(".content-area slot");
    expect(slot).to.exist;
  });

  it("forwards font-size-changed event from text controls", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls></epub-controls>`,
    );

    let eventDetail: { fontSize: number } | null = null;
    el.addEventListener("font-size-changed", ((e: CustomEvent) => {
      eventDetail = e.detail;
    }) as EventListener);

    const textControls = el.shadowRoot!.querySelector(
      "epub-text-controls",
    ) as HTMLElement;
    textControls.dispatchEvent(
      new CustomEvent("font-size-changed", {
        detail: { fontSize: 120 },
        bubbles: true,
        composed: true,
      }),
    );

    expect(eventDetail).to.not.be.null;
    expect(eventDetail!.fontSize).to.equal(120);
  });

  it("forwards theme-changed event from text controls", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls></epub-controls>`,
    );

    let eventDetail: { theme: string } | null = null;
    el.addEventListener("theme-changed", ((e: CustomEvent) => {
      eventDetail = e.detail;
    }) as EventListener);

    const textControls = el.shadowRoot!.querySelector(
      "epub-text-controls",
    ) as HTMLElement;
    textControls.dispatchEvent(
      new CustomEvent("theme-changed", {
        detail: { theme: "dark" },
        bubbles: true,
        composed: true,
      }),
    );

    expect(eventDetail).to.not.be.null;
    expect(eventDetail!.theme).to.equal("dark");
  });

  it("forwards flow-type-changed event from text controls", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls></epub-controls>`,
    );

    let eventDetail: { flowType: string } | null = null;
    el.addEventListener("flow-type-changed", ((e: CustomEvent) => {
      eventDetail = e.detail;
    }) as EventListener);

    const textControls = el.shadowRoot!.querySelector(
      "epub-text-controls",
    ) as HTMLElement;
    textControls.dispatchEvent(
      new CustomEvent("flow-type-changed", {
        detail: { flowType: "scrolled-continuous" },
        bubbles: true,
        composed: true,
      }),
    );

    expect(eventDetail).to.not.be.null;
    expect(eventDetail!.flowType).to.equal("scrolled-continuous");
  });

  it("auto-hides controls after delay", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls></epub-controls>`,
    );

    // Controls should start visible
    const overlay = el.shadowRoot!.querySelector(".controls-overlay");
    // After construction, the timer starts. Initially showControls is true.
    expect(overlay).to.exist;

    // After 2+ seconds, controls should hide (showControls = false)
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await el.updateComplete;

    expect(overlay!.classList.contains("visible")).to.be.false;
  });

  it("keeps controls visible when pinned", async () => {
    const el = await fixture<EpubControls>(
      html`<epub-controls></epub-controls>`,
    );

    const pinButton = el.shadowRoot!.querySelector(
      ".pin-controls",
    ) as HTMLElement;
    pinButton.click();
    await el.updateComplete;

    // Wait past auto-hide delay
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await el.updateComplete;

    const overlay = el.shadowRoot!.querySelector(".controls-overlay");
    expect(overlay!.classList.contains("pinned")).to.be.true;
  });
});
