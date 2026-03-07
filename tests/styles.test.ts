import { describe, it, expect } from "vitest";
import { CbzControlsStyles } from "../src/components/cbz/cbz-controls.styles";
import { CbzViewerStyles } from "../src/components/cbz/cbz-viewer.styles";
import { PopoverMenuStyles } from "../src/components/common/popover-menu.styles";
import { DocumentViewerStyles } from "../src/components/document-viewer.styles";
import { EpubConrolsStyles } from "../src/components/epub/epub-controls.styles";
import { EpubViewerStyles } from "../src/components/epub/epub-viewer.styles";
import { PdfViewerStyles } from "../src/components/pdf/pdf-viewer.styles";

describe("Style Modules", () => {
  it("DocumentViewerStyles exports a CSSResult", () => {
    expect(DocumentViewerStyles).to.exist;
    expect(DocumentViewerStyles.cssText).to.be.a("string");
    expect(DocumentViewerStyles.cssText).to.include(":host");
  });

  it("CbzControlsStyles exports a CSSResult", () => {
    expect(CbzControlsStyles).to.exist;
    expect(CbzControlsStyles.cssText).to.be.a("string");
    expect(CbzControlsStyles.cssText).to.include(":host");
  });

  it("CbzViewerStyles exports a CSSResult", () => {
    expect(CbzViewerStyles).to.exist;
    expect(CbzViewerStyles.cssText).to.be.a("string");
    expect(CbzViewerStyles.cssText).to.include(":host");
  });

  it("PopoverMenuStyles exports a CSSResult", () => {
    expect(PopoverMenuStyles).to.exist;
    expect(PopoverMenuStyles.cssText).to.be.a("string");
    expect(PopoverMenuStyles.cssText).to.include(":host");
  });

  it("EpubConrolsStyles exports a CSSResult", () => {
    expect(EpubConrolsStyles).to.exist;
    expect(EpubConrolsStyles.cssText).to.be.a("string");
    expect(EpubConrolsStyles.cssText).to.include(":host");
  });

  it("EpubViewerStyles exports a CSSResult", () => {
    expect(EpubViewerStyles).to.exist;
    expect(EpubViewerStyles.cssText).to.be.a("string");
    expect(EpubViewerStyles.cssText).to.include(":host");
  });

  it("PdfViewerStyles exports a CSSResult", () => {
    expect(PdfViewerStyles).to.exist;
    expect(PdfViewerStyles.cssText).to.be.a("string");
    expect(PdfViewerStyles.cssText).to.include(":host");
  });
});
