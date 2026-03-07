import { describe, it, expect } from "vitest";

describe("CBZ Interfaces", () => {
  it("ViewModeChangedEvent has correct shape", async () => {
    const event = new CustomEvent("view-mode-changed", {
      detail: { isDualPage: true },
    });

    expect(event.detail).to.have.property("isDualPage");
    expect(event.detail.isDualPage).to.be.true;
  });

  it("ViewModeChangedEvent with isDualPage false", async () => {
    const event = new CustomEvent("view-mode-changed", {
      detail: { isDualPage: false },
    });

    expect(event.detail.isDualPage).to.be.false;
  });
});

describe("EPUB Interfaces", () => {
  it("PageChangedEvent has correct shape", () => {
    const event = new CustomEvent("page-changed", {
      detail: { currentPage: 5, totalPages: 20 },
    });

    expect(event.detail).to.have.property("currentPage");
    expect(event.detail).to.have.property("totalPages");
    expect(event.detail.currentPage).to.equal(5);
    expect(event.detail.totalPages).to.equal(20);
  });

  it("FlowTypeChangedEvent has correct shape", () => {
    const event = new CustomEvent("flow-type-changed", {
      detail: { flowType: "paginated" },
    });

    expect(event.detail).to.have.property("flowType");
    expect(event.detail.flowType).to.equal("paginated");
  });

  it("FlowTypeChangedEvent with scrolled-continuous", () => {
    const event = new CustomEvent("flow-type-changed", {
      detail: { flowType: "scrolled-continuous" },
    });

    expect(event.detail.flowType).to.equal("scrolled-continuous");
  });

  it("EPUB ViewModeChangedEvent has correct shape", () => {
    const event = new CustomEvent("view-mode-changed", {
      detail: { isDualPage: true },
    });

    expect(event.detail).to.have.property("isDualPage");
    expect(event.detail.isDualPage).to.be.true;
  });
});
