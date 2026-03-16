import { html } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixture, fixtureCleanup } from "../helpers/index";
// Import the registration file
import "../../src/components/epub/epub-viewer";
import { EpubViewer } from "../../src/components/epub/EpubViewer";
import type {
	EpubFlowType,
	NavItem,
} from "../../src/components/epub/utils/epub-utils";
import * as epubUtils from "../../src/components/epub/utils/epub-utils";

interface RelocationData {
	start: {
		index: number;
		cfi?: string;
	};
}

/**
 * Type helper to access private/protected properties for testing
 */
interface TestEpubViewer extends EpubViewer {
	isLoading: boolean;
	error: string | null;
	toc: NavItem[];
	totalPages: number;
	currentPage: number;
	flowType: EpubFlowType;
	controlsPinned: boolean;
	fontSize: number;
	theme: "light" | "dark" | "sepia";
	_nextPage: () => Promise<void>;
	_prevPage: () => Promise<void>;
	_handlePinnedChange: (e: CustomEvent) => void;
	_handleFontSizeChange: (e: CustomEvent) => void;
	_handleThemeChange: (e: CustomEvent) => void;
	_handleFlowTypeChange: (e: CustomEvent) => Promise<void>;
	_onEpubRelocated: (location: RelocationData) => void;
}

// Mock EpubManager as a class
class MockEpubManager {
	loadBook = vi.fn().mockResolvedValue({
		toc: [{ label: "Chapter 1", href: "ch1.html" }],
		totalPages: 100,
		rawBook: {},
	});
	createRendition = vi.fn().mockResolvedValue(undefined);
	updateTheme = vi.fn();
	updateFontSize = vi.fn();
	setFlowType = vi.fn().mockResolvedValue(undefined);
	nextPage = vi.fn().mockResolvedValue(undefined);
	prevPage = vi.fn().mockResolvedValue(undefined);
	onRelocated = vi.fn();
	removeRelocatedListener = vi.fn();
	destroy = vi.fn();
}

const mockEpubManagerInstance = new MockEpubManager();

vi.mock("../../src/components/epub/utils/epub-utils", async () => {
	const actual = await vi.importActual<typeof epubUtils>(
		"../../src/components/epub/utils/epub-utils",
	);
	return {
		...actual,
		EpubManager: vi.fn().mockImplementation(function (this: unknown) {
			return mockEpubManagerInstance;
		}),
		loadSettings: vi.fn(() => ({
			fontSize: 100,
			theme: "light",
			flowType: "paginated",
		})),
		saveSettings: vi.fn(() => {}),
	};
});

describe("EpubViewer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
		} as Response);
	});

	afterEach(() => {
		fixtureCleanup();
		vi.restoreAllMocks();
	});

	describe("initialization", () => {
		it("is defined", () => {
			expect(EpubViewer).to.exist;
		});

		it("loads settings on construction", async () => {
			await fixture<EpubViewer>(html`<epub-viewer></epub-viewer>`);
			expect(epubUtils.loadSettings).toHaveBeenCalled();
		});
	});

	describe("file loading", () => {
		it("loads EPUB when src property is set", async () => {
			const el = await fixture<EpubViewer>(
				html`<epub-viewer .src=${"test.epub"}></epub-viewer>`,
			);

			await el.updateComplete;
			// Wait for async loadEpubDocument
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(globalThis.fetch).toHaveBeenCalledWith("test.epub");
			expect(mockEpubManagerInstance.loadBook).toHaveBeenCalled();
			expect(mockEpubManagerInstance.createRendition).toHaveBeenCalled();
			expect(el.totalPageCount).toBe(100);
		});

		it("handles fetch failure", async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				statusText: "Not Found",
			} as Response);

			const el = await fixture<EpubViewer>(
				html`<epub-viewer .src=${"test.epub"}></epub-viewer>`,
			);

			await new Promise((resolve) => setTimeout(resolve, 50));
			await el.updateComplete;

			expect((el as unknown as TestEpubViewer).error).to.contain(
				"Failed to fetch EPUB",
			);
		});

		it("handles generic error in loadEpubDocument", async () => {
			globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
			const el = await fixture<EpubViewer>(
				html`<epub-viewer .src=${"test.epub"}></epub-viewer>`,
			);
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect((el as unknown as TestEpubViewer).error).toBe("Network error");
		});
	});

	describe("navigation", () => {
		it("navigates forward and backward", async () => {
			const el = await fixture<EpubViewer>(html`<epub-viewer></epub-viewer>`);
			const testEl = el as unknown as TestEpubViewer;
			testEl.totalPages = 10;
			testEl.currentPage = 2;

			await testEl._nextPage();
			expect(mockEpubManagerInstance.nextPage).toHaveBeenCalled();
			expect(el.currentPageNumber).toBe(3);

			await testEl._prevPage();
			expect(mockEpubManagerInstance.prevPage).toHaveBeenCalled();
			expect(el.currentPageNumber).toBe(2);
		});

		it("handles arrow key navigation in paginated mode", async () => {
			const el = await fixture<EpubViewer>(html`<epub-viewer></epub-viewer>`);
			const testEl = el as unknown as TestEpubViewer;
			testEl.totalPages = 10;
			testEl.currentPage = 2;
			testEl.flowType = "paginated";

			const nextPageSpy = vi.spyOn(testEl, "_nextPage");
			const prevPageSpy = vi.spyOn(testEl, "_prevPage");

			el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
			expect(nextPageSpy).toHaveBeenCalled();

			el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
			expect(prevPageSpy).toHaveBeenCalled();
		});

		it("handles arrow key navigation in scrolled mode", async () => {
			const el = await fixture<EpubViewer>(html`<epub-viewer></epub-viewer>`);
			(el as unknown as TestEpubViewer).flowType = "scrolled-continuous";
			await el.updateComplete;

			const container = el.shadowRoot?.querySelector(
				".epub-container",
			) as HTMLElement;
			expect(container).to.exist;
			container.scrollBy = vi.fn();

			el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
			expect(container.scrollBy).toHaveBeenCalledWith(
				expect.objectContaining({ top: 100 }),
			);

			el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
			expect(container.scrollBy).toHaveBeenCalledWith(
				expect.objectContaining({ top: -100 }),
			);
		});
	});

	describe("settings and state", () => {
		it("updates pinned state", async () => {
			const el = await fixture<EpubViewer>(html`<epub-viewer></epub-viewer>`);
			const event = new CustomEvent("controls-pinned-changed", {
				detail: { pinned: true },
			});
			(el as unknown as TestEpubViewer)._handlePinnedChange(event);
			expect((el as unknown as TestEpubViewer).controlsPinned).toBe(true);
		});

		it("has totalPageCount and tableOfContents getters", async () => {
			const el = await fixture<EpubViewer>(html`<epub-viewer></epub-viewer>`);
			const testEl = el as unknown as TestEpubViewer;
			testEl.totalPages = 50;
			testEl.toc = [{ label: "Ch1", href: "ch1", id: "1" }];

			expect(el.totalPageCount).toBe(50);
			expect(el.tableOfContents.length).toBe(1);
			expect(el.currentPageNumber).toBe(1);
		});
	});

	describe("settings changes", () => {
		it("updates font size", async () => {
			const el = await fixture<EpubViewer>(html`<epub-viewer></epub-viewer>`);
			const event = new CustomEvent("font-size-changed", {
				detail: { fontSize: 120 },
			});

			(el as unknown as TestEpubViewer)._handleFontSizeChange(event);

			expect((el as unknown as TestEpubViewer).fontSize).toBe(120);
			expect(mockEpubManagerInstance.updateFontSize).toHaveBeenCalledWith(120);
			expect(epubUtils.saveSettings).toHaveBeenCalled();
		});

		it("updates theme", async () => {
			const el = await fixture<EpubViewer>(html`<epub-viewer></epub-viewer>`);
			const event = new CustomEvent("theme-changed", {
				detail: { theme: "dark" },
			});

			(el as unknown as TestEpubViewer)._handleThemeChange(event);

			expect((el as unknown as TestEpubViewer).theme).toBe("dark");
			expect(mockEpubManagerInstance.updateTheme).toHaveBeenCalledWith("dark");
			expect(epubUtils.saveSettings).toHaveBeenCalled();
		});

		it("updates flow type", async () => {
			const el = await fixture<EpubViewer>(html`<epub-viewer></epub-viewer>`);
			const event = new CustomEvent("flow-type-changed", {
				detail: { flowType: "scrolled-continuous" },
			});

			await (el as unknown as TestEpubViewer)._handleFlowTypeChange(event);

			expect((el as unknown as TestEpubViewer).flowType).toBe(
				"scrolled-continuous",
			);
			expect(mockEpubManagerInstance.setFlowType).toHaveBeenCalled();
			expect(epubUtils.saveSettings).toHaveBeenCalled();
		});
	});

	describe("relocation", () => {
		it("updates current page when relocated in scrolled mode", async () => {
			const el = await fixture<EpubViewer>(html`<epub-viewer></epub-viewer>`);
			const testEl = el as unknown as TestEpubViewer;
			testEl.flowType = "scrolled-continuous";
			testEl.currentPage = 1;

			const relocationData = {
				start: { index: 5 },
			};

			testEl._onEpubRelocated(relocationData);

			expect(el.currentPageNumber).toBe(6);
		});
	});

	describe("lifecycle", () => {
		it("cleans up on disconnectedCallback", async () => {
			const el = await fixture<EpubViewer>(html`<epub-viewer></epub-viewer>`);
			el.disconnectedCallback();

			expect(
				mockEpubManagerInstance.removeRelocatedListener,
			).toHaveBeenCalled();
			expect(mockEpubManagerInstance.destroy).toHaveBeenCalled();
		});
	});
});
