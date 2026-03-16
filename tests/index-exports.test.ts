import { beforeAll, describe, expect, it, vi } from "vitest";

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

describe("index exports", () => {
	let indexModule: typeof import("../src/index");

	beforeAll(async () => {
		indexModule = await import("../src/index");
	});

	it("exports DocumentRouter", () => {
		expect(indexModule.DocumentRouter).to.exist;
	});

	it("exports DocumentViewerStyles", () => {
		expect(indexModule.DocumentViewerStyles).to.exist;
	});

	it("exports EpubViewer", () => {
		expect(indexModule.EpubViewer).to.exist;
	});

	it("exports EpubControls", () => {
		expect(indexModule.EpubControls).to.exist;
	});

	it("exports EpubManager", () => {
		expect(indexModule.EpubManager).to.exist;
	});

	it("exports EpubViewerStyles", () => {
		expect(indexModule.EpubViewerStyles).to.exist;
	});

	it("exports loadSettings function", () => {
		expect(indexModule.loadSettings).to.be.a("function");
	});

	it("exports saveSettings function", () => {
		expect(indexModule.saveSettings).to.be.a("function");
	});

	it("exports CbzViewer", () => {
		expect(indexModule.CbzViewer).to.exist;
	});

	it("exports CbzControls", () => {
		expect(indexModule.CbzControls).to.exist;
	});

	it("exports CbzViewerStyles", () => {
		expect(indexModule.CbzViewerStyles).to.exist;
	});

	it("exports PdfViewer", () => {
		expect(indexModule.PdfViewer).to.exist;
	});

	it("exports PdfViewerStyles", () => {
		expect(indexModule.PdfViewerStyles).to.exist;
	});
});
