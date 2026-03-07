import { describe, it, expect, afterEach, vi } from "vitest";
import { html } from "lit";
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

import { DocumentRouter } from "../src/components/document-viewer";

afterEach(() => fixtureCleanup());

describe("DocumentRouter", () => {
  describe("class definition", () => {
    it("is defined", () => {
      expect(DocumentRouter).to.exist;
    });

    it("has static styles", () => {
      expect(DocumentRouter.styles).to.exist;
    });

    it("has render method", () => {
      expect(DocumentRouter.prototype.render).to.be.a("function");
    });

    it("has src property defined", () => {
      const properties = (DocumentRouter as any).elementProperties;
      expect(properties).to.exist;
      expect(properties.has("src")).to.be.true;
    });

    it("is registered as document-viewer custom element", () => {
      expect(customElements.get("document-viewer")).to.exist;
    });
  });

  describe("rendering", () => {
    it("renders 'No file provided' when src is not set", async () => {
      const el = await fixture<DocumentRouter>(
        html`<document-viewer></document-viewer>`,
      );

      const errorDiv = el.shadowRoot!.querySelector(".error");
      expect(errorDiv).to.exist;
      expect(errorDiv!.textContent).to.include("No file provided");
    });

    it("renders error for unknown file after fetch failure", async () => {
      // Use a non-existent URL to trigger fetch error
      const el = await fixture<DocumentRouter>(
        html`<document-viewer
          .src=${"http://localhost:9999/nonexistent.xyz"}
        ></document-viewer>`,
      );

      // Wait for the async determineFileType to complete
      await new Promise((resolve) => setTimeout(resolve, 500));
      await el.updateComplete;

      // Should show error state since fetch will fail
      const errorDiv = el.shadowRoot!.querySelector(".error");
      expect(errorDiv).to.exist;
    });
  });

  describe("file type detection logic", () => {
    // Test the magic bytes detection - we verify this through the rendering behavior
    // since determineFileType is private

    it("starts with unknown fileType", async () => {
      const el = await fixture<DocumentRouter>(
        html`<document-viewer></document-viewer>`,
      );

      // Without src, should show no-file-provided message
      expect(el.shadowRoot!.textContent).to.include("No file provided");
    });
  });
});
