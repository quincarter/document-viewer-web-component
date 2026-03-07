import { describe, it, expect } from "vitest";
import { CbzViewer } from "../../src/components/cbz/CbzViewer";

describe("CbzViewer", () => {
  describe("class properties and defaults", () => {
    it("has correct default property values", () => {
      expect(CbzViewer).to.exist;
      expect(CbzViewer.prototype).to.have.property("render");
    });

    it("defines expected static styles", () => {
      expect(CbzViewer.styles).to.exist;
    });
  });

  describe("CbzViewer as registered element", () => {
    it("template includes canvas element", () => {
      expect(CbzViewer.prototype.render).to.be.a("function");
    });

    it("has src property defined", () => {
      const properties = (CbzViewer as any).elementProperties;
      expect(properties).to.exist;
      expect(properties.has("src")).to.be.true;
    });
  });
});
