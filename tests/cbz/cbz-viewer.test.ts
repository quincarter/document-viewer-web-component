import { html } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixture, fixtureCleanup } from "../helpers/index";
// Import registration to ensure custom element is defined
import "../../src/components/cbz/cbz-viewer";
import { CbzViewer } from "../../src/components/cbz/CbzViewer";

/**
 * Type helper to access private/protected properties for testing
 */
interface TestCbzViewer extends CbzViewer {
	_currentPage: number;
	_totalPages: number;
	_loading: boolean;
	_error: string | null;
	_currentDocumentId: string | null;
	_isDualPage: boolean;
	_cbzWorker: Worker;
	_canvas: HTMLCanvasElement;
	_ctx: CanvasRenderingContext2D;
	_loadDocument(): Promise<void>;
	_renderCurrentPage(): Promise<void>;
	_handleNextPage(): void;
	_handlePrevPage(): void;
	_drawImageToCanvas(img: HTMLImageElement, isSecondPage?: boolean): void;
	_handleWorkerMessage(event: MessageEvent): void;
}

// Mock ResizeObserver
let resizeCallback: (() => void) | undefined;
globalThis.ResizeObserver = class ResizeObserver {
	constructor(callback: () => void) {
		resizeCallback = callback;
	}
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
};

// Mock URL
globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
globalThis.URL.revokeObjectURL = vi.fn();

// Mock Image
class MockImage {
	onload: (() => void) | null = null;
	onerror: ((err: Event | string) => void) | null = null;
	src: string = "";
	naturalWidth: number = 800;
	naturalHeight: number = 1200;
}
globalThis.Image = MockImage as unknown as typeof Image;

// Mock Canvas context
const mockCtx = {
	clearRect: vi.fn(),
	drawImage: vi.fn(),
} as unknown as CanvasRenderingContext2D;

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);

describe("CbzViewer", () => {
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
			expect(CbzViewer).to.exist;
		});
	});

	describe("file loading", () => {
		it("handles fetch error", async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				statusText: "Not Found",
			} as Response);

			const el = await fixture<CbzViewer>(
				html`<cbz-viewer .src=${"test.cbz"}></cbz-viewer>`,
			);
			const testEl = el as unknown as TestCbzViewer;
			const worker = testEl._cbzWorker;
			worker.onmessage?.(
				new MessageEvent("message", {
					data: { type: "cbzWorkerInitialized", success: true },
				}),
			);

			await new Promise((resolve) => setTimeout(resolve, 50));
			await el.updateComplete;

			expect(testEl._error).to.contain("Failed to load CBZ file");
		});
	});

	describe("worker message handling", () => {
		it("updates state on cbzLoaded message", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			const worker = testEl._cbzWorker;

			worker.onmessage?.(
				new MessageEvent("message", {
					data: {
						type: "cbzLoaded",
						success: true,
						totalPages: 50,
						documentId: "test-doc",
					},
				}),
			);

			expect(testEl._totalPages).toBe(50);
			expect(testEl._currentDocumentId).toBe("test-doc");
			expect(testEl._loading).toBe(false);
		});

		it("handles cbzPageRendered message", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			testEl._currentDocumentId = "test-doc";
			const worker = testEl._cbzWorker;

			worker.onmessage?.(
				new MessageEvent("message", {
					data: {
						type: "cbzPageRendered",
						success: true,
						documentId: "test-doc",
						imageData: new ArrayBuffer(10),
						imageMimeType: "image/jpeg",
					},
				}),
			);

			expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
		});

		it("handles worker error messages", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			const worker = testEl._cbzWorker;

			worker.onmessage?.(
				new MessageEvent("message", {
					data: {
						type: "error",
						success: false,
						message: "Worker error",
					},
				}),
			);

			expect(testEl._error).toBe("Worker error");
		});

		it("handles generic worker onerror event", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			const worker = testEl._cbzWorker;

			worker.onerror?.(
				new ErrorEvent("error", { message: "Generic worker error" }),
			);

			expect(testEl._error).toBe("CBZ worker encountered an error.");
		});
	});

	describe("navigation", () => {
		it("navigates forward and backward in single page mode", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			testEl._totalPages = 10;
			testEl._currentDocumentId = "test-doc";
			testEl._loading = false;

			testEl._handleNextPage();
			expect(testEl._currentPage).toBe(2);

			testEl._handlePrevPage();
			expect(testEl._currentPage).toBe(1);
		});

		it("navigates forward in dual page mode", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			testEl._totalPages = 10;
			testEl._isDualPage = true;
			testEl._currentDocumentId = "test-doc";
			testEl._loading = false;

			// Cover (1) -> Next -> Pair (2, 3)
			testEl._handleNextPage();
			expect(testEl._currentPage).toBe(2);

			// Pair (2, 3) -> Next -> Pair (4, 5)
			testEl._handleNextPage();
			expect(testEl._currentPage).toBe(4);
		});

		it("navigates backward in dual page mode", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			testEl._totalPages = 10;
			testEl._isDualPage = true;
			testEl._currentPage = 4;
			testEl._currentDocumentId = "test-doc";

			// Pair (4, 5) -> Prev -> Pair (2, 3)
			testEl._handlePrevPage();
			expect(testEl._currentPage).toBe(2);

			// Pair (2, 3) -> Prev -> Cover (1)
			testEl._handlePrevPage();
			expect(testEl._currentPage).toBe(1);
		});

		it("handles dual page boundary for odd total pages", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			testEl._totalPages = 5;
			testEl._isDualPage = true;
			testEl._currentPage = 4; // showing (4, 5)
			testEl._currentDocumentId = "test-doc";

			testEl._handleNextPage();
			expect(testEl._currentPage).toBe(5); // last page alone?
		});
	});

	describe("interactions", () => {
		it("handles canvas click for navigation", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			testEl._totalPages = 10;
			testEl._currentPage = 2;
			testEl._loading = false;
			testEl._currentDocumentId = "test-doc";

			const canvas = el.shadowRoot?.querySelector(
				"canvas",
			) as HTMLCanvasElement;
			canvas.getBoundingClientRect = vi
				.fn()
				.mockReturnValue({ left: 0, top: 0, width: 900, height: 600 });
			testEl._canvas = canvas;
			testEl._canvas.width = 900;

			// Click left third
			canvas.dispatchEvent(new MouseEvent("click", { clientX: 100 }));
			expect(testEl._currentPage).toBe(1);

			// Click right third
			canvas.dispatchEvent(new MouseEvent("click", { clientX: 800 }));
			expect(testEl._currentPage).toBe(2);
		});

		it("handles view mode change event", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			testEl._totalPages = 10;
			testEl._currentPage = 3;
			testEl._loading = false;
			testEl._currentDocumentId = "test-doc";

			await el.updateComplete;

			const controls = el.shadowRoot?.querySelector("cbz-controls");
			controls?.dispatchEvent(
				new CustomEvent("view-mode-changed", {
					detail: { isDualPage: true },
				}),
			);

			expect(testEl._isDualPage).toBe(true);
			expect(testEl._currentPage).toBe(2);
		});
	});

	describe("rendering and resizing", () => {
		it("draws image to canvas", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			const ctx = testEl._ctx;
			const spy = vi.spyOn(ctx, "drawImage");

			const img = new Image();
			testEl._drawImageToCanvas(img, false);

			expect(spy).toHaveBeenCalled();
		});

		it("handles resize observer callback", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			testEl._currentDocumentId = "test-doc";
			const canvas = testEl._canvas;
			vi.spyOn(canvas, "offsetWidth", "get").mockReturnValue(500);
			vi.spyOn(canvas, "offsetHeight", "get").mockReturnValue(700);

			resizeCallback?.();

			expect(canvas.width).toBe(500);
			expect(canvas.height).toBe(700);
		});
	});

	describe("edge cases", () => {
		it("does not load document without src", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			const spy = vi.spyOn(globalThis, "fetch");
			testEl._loadDocument();
			expect(spy).not.toHaveBeenCalled();
		});

		it("handles missing image data in worker message", async () => {
			const el = await fixture<CbzViewer>(html`<cbz-viewer></cbz-viewer>`);
			const testEl = el as unknown as TestCbzViewer;
			testEl._currentDocumentId = "test-doc";
			const worker = testEl._cbzWorker;

			worker.onmessage?.(
				new MessageEvent("message", {
					data: {
						type: "cbzPageRendered",
						success: true,
						documentId: "test-doc",
						// Missing imageData
					},
				}),
			);

			expect(testEl._error).to.contain("Invalid image data");
		});
	});
});
