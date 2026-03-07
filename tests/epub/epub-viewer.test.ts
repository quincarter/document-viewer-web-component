import { describe, it, expect, vi, beforeAll } from "vitest";

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

import { EpubViewer } from "../../src/components/epub/EpubViewer";

describe("EpubViewer", () => {
  describe("class definition", () => {
    it("is defined", () => {
      expect(EpubViewer).to.exist;
    });

    it("has static styles", () => {
      expect(EpubViewer.styles).to.exist;
    });

    it("has render method", () => {
      expect(EpubViewer.prototype.render).to.be.a("function");
    });

    it("has loadEpubDocument method", () => {
      expect(EpubViewer.prototype.loadEpubDocument).to.be.a("function");
    });

    it("has src property defined", () => {
      const properties = (EpubViewer as any).elementProperties;
      expect(properties).to.exist;
      expect(properties.has("src")).to.be.true;
    });

    it("has getter methods defined", () => {
      const proto = EpubViewer.prototype;
      const descriptor1 = Object.getOwnPropertyDescriptor(
        proto,
        "currentPageNumber",
      );
      expect(descriptor1).to.exist;
      expect(descriptor1!.get).to.be.a("function");

      const descriptor2 = Object.getOwnPropertyDescriptor(
        proto,
        "totalPageCount",
      );
      expect(descriptor2).to.exist;
      expect(descriptor2!.get).to.be.a("function");

      const descriptor3 = Object.getOwnPropertyDescriptor(
        proto,
        "tableOfContents",
      );
      expect(descriptor3).to.exist;
      expect(descriptor3!.get).to.be.a("function");
    });
  });

  describe("element registration", () => {
    beforeAll(async () => {
      // Import the registration module
      await import("../../src/components/epub/epub-viewer");
    });

    it("is registered as epub-viewer custom element", () => {
      expect(customElements.get("epub-viewer")).to.exist;
    });
  });
});
