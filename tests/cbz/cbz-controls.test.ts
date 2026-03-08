import { describe, it, expect, afterEach } from "vitest";
import { html } from "lit";
import { fixture, fixtureCleanup } from "../helpers/index";
import type { CbzControls } from "../../src/components/cbz/cbz-controls";
import "../../src/components/cbz/cbz-controls";

afterEach(() => fixtureCleanup());

describe("cbz-controls", () => {
  it("is defined as a custom element", () => {
    expect(customElements.get("cbz-controls")).to.exist;
  });

  it("renders with default properties", async () => {
    const el = await fixture<CbzControls>(html`<cbz-controls></cbz-controls>`);

    expect(el.currentPage).to.equal(1);
    expect(el.totalPages).to.equal(0);
    expect(el.isDualPage).to.be.false;
  });

  it("renders page info", async () => {
    const el = await fixture<CbzControls>(
      html`<cbz-controls .currentPage=${3} .totalPages=${10}></cbz-controls>`,
    );

    const pageInfo = el.shadowRoot!.querySelector(".page-info");
    expect(pageInfo).to.exist;
    expect(pageInfo!.textContent).to.include("3");
    expect(pageInfo!.textContent).to.include("10");
  });

  it("renders dual page toggle button", async () => {
    const el = await fixture<CbzControls>(html`<cbz-controls></cbz-controls>`);

    const button = el.shadowRoot!.querySelector("button");
    expect(button).to.exist;
    expect(button!.textContent).to.include("Dual");
  });

  it("shows Single Page text when in dual page mode", async () => {
    const el = await fixture<CbzControls>(
      html`<cbz-controls .isDualPage=${true}></cbz-controls>`,
    );

    const button = el.shadowRoot!.querySelector("button");
    expect(button!.textContent).to.include("Single");
  });

  it("dispatches view-mode-changed event on toggle", async () => {
    const el = await fixture<CbzControls>(html`<cbz-controls></cbz-controls>`);

    let eventDetail: { isDualPage: boolean } | null = null;
    el.addEventListener("view-mode-changed", ((e: CustomEvent) => {
      eventDetail = e.detail;
    }) as EventListener);

    const button = el.shadowRoot!.querySelector("button") as HTMLElement;
    button.click();

    expect(eventDetail).to.not.be.null;
    expect(eventDetail!.isDualPage).to.be.true;
  });

  it("toggles isDualPage state on button click", async () => {
    const el = await fixture<CbzControls>(html`<cbz-controls></cbz-controls>`);

    expect(el.isDualPage).to.be.false;

    const button = el.shadowRoot!.querySelector("button") as HTMLElement;
    button.click();
    expect(el.isDualPage).to.be.true;

    button.click();
    expect(el.isDualPage).to.be.false;
  });

  it("event bubbles and is composed", async () => {
    const el = await fixture<CbzControls>(html`<cbz-controls></cbz-controls>`);

    let event: CustomEvent | null = null;
    el.addEventListener("view-mode-changed", ((e: CustomEvent) => {
      event = e;
    }) as EventListener);

    const button = el.shadowRoot!.querySelector("button") as HTMLElement;
    button.click();

    expect(event).to.not.be.null;
    expect(event!.bubbles).to.be.true;
    expect(event!.composed).to.be.true;
  });

  it("updates page info dynamically", async () => {
    const el = await fixture<CbzControls>(
      html`<cbz-controls .currentPage=${1} .totalPages=${5}></cbz-controls>`,
    );

    let pageInfo = el.shadowRoot!.querySelector(".page-info");
    expect(pageInfo!.textContent).to.include("1");
    expect(pageInfo!.textContent).to.include("5");

    el.currentPage = 3;
    el.totalPages = 20;
    await el.updateComplete;

    pageInfo = el.shadowRoot!.querySelector(".page-info");
    expect(pageInfo!.textContent).to.include("3");
    expect(pageInfo!.textContent).to.include("20");
  });
});
