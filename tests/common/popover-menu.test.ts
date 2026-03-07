import { describe, it, expect, afterEach } from "vitest";
import { html } from "lit";
import { fixture, fixtureCleanup } from "../helpers/index";
import type { PopoverMenu } from "../../src/components/common/popover-menu";
import "../../src/components/common/popover-menu";

afterEach(() => fixtureCleanup());

describe("popover-menu", () => {
  it("is defined as a custom element", () => {
    expect(customElements.get("popover-menu")).to.exist;
  });

  it("renders with default properties", async () => {
    const el = await fixture<PopoverMenu>(
      html`<popover-menu>
        <button slot="trigger">Open</button>
        <div>Content</div>
      </popover-menu>`,
    );

    expect(el.open).to.be.false;
    expect(el.position).to.equal("bottom");
    expect(el.alignment).to.equal("end");
  });

  it("renders trigger slot content", async () => {
    const el = await fixture<PopoverMenu>(
      html`<popover-menu>
        <button slot="trigger">Open Me</button>
      </popover-menu>`,
    );

    const trigger = el.querySelector('[slot="trigger"]');
    expect(trigger).to.exist;
    expect(trigger!.textContent).to.equal("Open Me");
  });

  it("renders popover content slot", async () => {
    const el = await fixture<PopoverMenu>(
      html`<popover-menu>
        <button slot="trigger">Open</button>
        <div class="content">Hello</div>
      </popover-menu>`,
    );

    const content = el.querySelector(".content");
    expect(content).to.exist;
    expect(content!.textContent).to.equal("Hello");
  });

  it("popover starts not visible", async () => {
    const el = await fixture<PopoverMenu>(
      html`<popover-menu>
        <button slot="trigger">Open</button>
        <div>Content</div>
      </popover-menu>`,
    );

    const popover = el.shadowRoot!.querySelector(".popover");
    expect(popover).to.exist;
    expect(popover!.classList.contains("visible")).to.be.false;
  });

  it("toggles open on trigger click", async () => {
    const el = await fixture<PopoverMenu>(
      html`<popover-menu>
        <button slot="trigger">Open</button>
        <div>Content</div>
      </popover-menu>`,
    );

    const trigger = el.shadowRoot!.querySelector(".trigger") as HTMLElement;
    trigger.click();
    await el.updateComplete;

    expect(el.open).to.be.true;
    const popover = el.shadowRoot!.querySelector(".popover");
    expect(popover!.classList.contains("visible")).to.be.true;
  });

  it("toggles closed on second trigger click", async () => {
    const el = await fixture<PopoverMenu>(
      html`<popover-menu>
        <button slot="trigger">Open</button>
        <div>Content</div>
      </popover-menu>`,
    );

    const trigger = el.shadowRoot!.querySelector(".trigger") as HTMLElement;
    trigger.click();
    await el.updateComplete;
    expect(el.open).to.be.true;

    trigger.click();
    await el.updateComplete;
    expect(el.open).to.be.false;
  });

  it("dispatches popover-toggle event on open", async () => {
    const el = await fixture<PopoverMenu>(
      html`<popover-menu>
        <button slot="trigger">Open</button>
        <div>Content</div>
      </popover-menu>`,
    );

    let eventDetail: { open: boolean } | null = null;
    el.addEventListener("popover-toggle", ((e: CustomEvent) => {
      eventDetail = e.detail;
    }) as EventListener);

    const trigger = el.shadowRoot!.querySelector(".trigger") as HTMLElement;
    trigger.click();

    expect(eventDetail).to.not.be.null;
    expect(eventDetail!.open).to.be.true;
  });

  it("dispatches popover-toggle event on close", async () => {
    const el = await fixture<PopoverMenu>(
      html`<popover-menu .open=${true}>
        <button slot="trigger">Open</button>
        <div>Content</div>
      </popover-menu>`,
    );

    let eventDetail: { open: boolean } | null = null;
    el.addEventListener("popover-toggle", ((e: CustomEvent) => {
      eventDetail = e.detail;
    }) as EventListener);

    const trigger = el.shadowRoot!.querySelector(".trigger") as HTMLElement;
    trigger.click();

    expect(eventDetail).to.not.be.null;
    expect(eventDetail!.open).to.be.false;
  });

  it("closePopover() closes an open popover", async () => {
    const el = await fixture<PopoverMenu>(
      html`<popover-menu .open=${true}>
        <button slot="trigger">Open</button>
        <div>Content</div>
      </popover-menu>`,
    );

    expect(el.open).to.be.true;

    let eventFired = false;
    el.addEventListener("popover-toggle", () => {
      eventFired = true;
    });

    el.closePopover();
    expect(el.open).to.be.false;
    expect(eventFired).to.be.true;
  });

  it("closePopover() does nothing when already closed", async () => {
    const el = await fixture<PopoverMenu>(
      html`<popover-menu>
        <button slot="trigger">Open</button>
        <div>Content</div>
      </popover-menu>`,
    );

    let eventFired = false;
    el.addEventListener("popover-toggle", () => {
      eventFired = true;
    });

    el.closePopover();
    expect(el.open).to.be.false;
    expect(eventFired).to.be.false;
  });

  it("applies position classes", async () => {
    const el = await fixture<PopoverMenu>(
      html`<popover-menu position="top" alignment="start">
        <button slot="trigger">Open</button>
        <div>Content</div>
      </popover-menu>`,
    );

    const popover = el.shadowRoot!.querySelector(".popover");
    expect(popover!.classList.contains("top")).to.be.true;
    expect(popover!.classList.contains("start")).to.be.true;
  });

  it("reflects open attribute", async () => {
    const el = await fixture<PopoverMenu>(
      html`<popover-menu .open=${true}>
        <button slot="trigger">Open</button>
        <div>Content</div>
      </popover-menu>`,
    );
    await el.updateComplete;

    expect(el.hasAttribute("open")).to.be.true;
  });
});
