import { describe, it, expect, beforeAll } from "vitest";
import { PdfViewer } from "../../src/components/pdf/PdfViewer";

describe("PdfViewer", () => {
  describe("class definition", () => {
    it("is defined", () => {
      expect(PdfViewer).to.exist;
    });

    it("has static styles", () => {
      expect(PdfViewer.styles).to.exist;
    });

    it("has render method", () => {
      expect(PdfViewer.prototype.render).to.be.a("function");
    });

    it("has src property defined", () => {
      const properties = (PdfViewer as any).elementProperties;
      expect(properties).to.exist;
      expect(properties.has("src")).to.be.true;
    });

    it("has viewerTitle property defined", () => {
      const properties = (PdfViewer as any).elementProperties;
      expect(properties.has("viewerTitle")).to.be.true;
    });
  });

  describe("element registration", () => {
    beforeAll(async () => {
      await import("../../src/components/pdf/pdf-viewer");
    });

    it("is registered as pdf-viewer custom element", () => {
      expect(customElements.get("pdf-viewer")).to.exist;
    });
  });
});
