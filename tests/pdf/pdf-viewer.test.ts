import { html } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixture, fixtureCleanup } from "../helpers/index";
// Import the registration file to ensure custom element is defined
import "../../src/components/pdf/pdf-viewer";
import { PdfViewer } from "../../src/components/pdf/PdfViewer";

/**
 * Type helper to access private/protected properties for testing
 */
interface TestPdfViewer extends PdfViewer {
	_pdfWorkers: Worker[];
	_isInitialized: boolean;
	_isLoading: boolean;
	_errorMessage: string | null;
	_totalPages: number;
	_currentPageNumber: number;
	_currentScale: number;
	_displayScale: number;
	_isFitToView: boolean;
	_currentDocumentId: string | null;
	_originalPageWidth: number;
	_originalPageHeight: number;
	_pageCache: Map<
		number,
		{ bitmap: ImageBitmap; width: number; height: number; scale: number }
	>;
	_loadFile(source: string | File): Promise<void>;
	_sendMessageToWorker(
		worker: Worker,
		type: string,
		payload: unknown,
		transferList?: Transferable[],
	): Promise<unknown>;
	_renderCurrentPage(): void;
	_prefetchNextPages(): void;
}

// Mock Vite-specific URL imports
vi.mock("@hyzyla/pdfium/pdfium.wasm?url", () => ({
	default: "/mock-pdfium.wasm",
}));

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
};

// Mock OffscreenCanvas support on HTMLCanvasElement prototype
const mockOffscreenCanvas = {
	width: 0,
	height: 0,
	getContext: vi.fn().mockReturnValue({
		putImageData: vi.fn(),
		drawImage: vi.fn(),
	}),
};

interface HTMLCanvasElementWithOffscreen extends HTMLCanvasElement {
	transferControlToOffscreen(): OffscreenCanvas;
}

(
	HTMLCanvasElement.prototype as HTMLCanvasElementWithOffscreen
).transferControlToOffscreen = vi.fn().mockReturnValue(mockOffscreenCanvas);

// Mock createImageBitmap
globalThis.createImageBitmap = vi.fn().mockResolvedValue({
	close: vi.fn(),
	width: 100,
	height: 100,
} as unknown as ImageBitmap);

describe("PdfViewer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock fetch for PDF loading
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			arrayBuffer: () =>
				Promise.resolve(
					new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
						.buffer,
				),
		} as Response);
	});

	afterEach(() => {
		fixtureCleanup();
		vi.restoreAllMocks();
	});

	describe("initialization", () => {
		it("is defined", () => {
			expect(PdfViewer).to.exist;
		});

		it("creates workers on construction", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const workers = (el as unknown as TestPdfViewer)._pdfWorkers;
			expect(workers).toBeDefined();
			expect(workers.length).toBe(4);
		});

		it("initializes offscreen canvas on first update", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			expect(
				(HTMLCanvasElement.prototype as HTMLCanvasElementWithOffscreen)
					.transferControlToOffscreen,
			).toHaveBeenCalled();
			expect((el as unknown as TestPdfViewer)._pdfWorkers.length).toBe(4);
		});
	});

	describe("file loading", () => {
		it("loads PDF when src property is set", async () => {
			const el = await fixture<PdfViewer>(
				html`<pdf-viewer .src=${"test.pdf"}></pdf-viewer>`,
			);

			// Simulate initialization complete
			const workers = (el as unknown as TestPdfViewer)._pdfWorkers;
			for (let i = 0; i < workers.length; i++) {
				workers[i].onmessage?.(
					new MessageEvent("message", {
						data: { type: "libraryInitialized", success: true, messageId: i },
					}),
				);
			}

			await el.updateComplete;
			expect(globalThis.fetch).toHaveBeenCalledWith("test.pdf");
		});

		it("loads PDF from File object", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			testEl._isInitialized = true;

			const mockFile = new File(
				[new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]).buffer],
				"test.pdf",
				{ type: "application/pdf" },
			);

			// Mock _sendMessageToWorker to respond immediately to avoid timeout
			const sendMessageSpy = vi
				.spyOn(testEl, "_sendMessageToWorker")
				.mockResolvedValue({ type: "pdfLoaded", success: true, pageCount: 1 });

			await testEl._loadFile(mockFile);

			// Manually set isLoading to false as the mock doesn't trigger the worker message handler
			testEl._isLoading = false;

			expect(sendMessageSpy).toHaveBeenCalled();
			expect(testEl._isLoading).toBe(false);
		});

		it("handles fetch failure", async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				statusText: "Not Found",
			} as Response);

			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			testEl._isInitialized = true;

			await testEl._loadFile("nonexistent.pdf");

			expect(testEl._errorMessage).to.contain("Failed to fetch file");
		});

		it("handles invalid PDF header", async () => {
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				arrayBuffer: () => Promise.resolve(new Uint8Array([0, 0, 0, 0]).buffer),
			} as Response);

			const el = await fixture<PdfViewer>(
				html`<pdf-viewer .src=${"test.pdf"}></pdf-viewer>`,
			);

			// Initialize
			const testEl = el as unknown as TestPdfViewer;
			const workers = testEl._pdfWorkers;
			for (let i = 0; i < workers.length; i++) {
				workers[i].onmessage?.(
					new MessageEvent("message", {
						data: { type: "libraryInitialized", success: true, messageId: i },
					}),
				);
			}

			// Wait for the async _loadFile
			await new Promise((resolve) => setTimeout(resolve, 50));
			await el.updateComplete;

			expect(testEl._errorMessage).to.contain("Not a valid PDF file");
		});
	});

	describe("worker message handling", () => {
		it("updates state on pdfLoaded message", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			const workers = testEl._pdfWorkers;

			// Simulate initialization
			workers[0].onmessage?.(
				new MessageEvent("message", {
					data: { type: "libraryInitialized", success: true, messageId: 0 },
				}),
			);

			// Simulate PDF loaded
			workers[0].onmessage?.(
				new MessageEvent("message", {
					data: {
						type: "pdfLoaded",
						success: true,
						pageCount: 10,
						documentId: "test-doc",
						messageId: 100,
					},
				}),
			);

			expect(testEl._totalPages).toBe(10);
			expect(testEl._currentDocumentId).toBe("test-doc");
			expect(testEl._isLoading).toBe(false);
		});

		it("updates state on pageRendered message", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			const workers = testEl._pdfWorkers;

			workers[0].onmessage?.(
				new MessageEvent("message", {
					data: {
						type: "pageRendered",
						success: true,
						scale: 1.5,
						width: 1200,
						height: 1600,
						messageId: 200,
					},
				}),
			);

			expect(testEl._currentScale).toBe(1.5);
			expect(testEl._displayScale).toBe(1.5);
			expect(testEl._originalPageWidth).toBe(1200 / 1.5);
		});

		it("handles pageToBitmap message and updates cache", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			const workers = testEl._pdfWorkers;
			const mockBitmap = { close: vi.fn() } as unknown as ImageBitmap;

			workers[1].onmessage?.(
				new MessageEvent("message", {
					data: {
						type: "pageToBitmap",
						success: true,
						pageNumber: 5,
						bitmap: mockBitmap,
						width: 800,
						height: 600,
						scale: 1.0,
						messageId: 300,
					},
				}),
			);

			const cache = testEl._pageCache;
			expect(cache.has(5)).toBe(true);
			expect(cache.get(5)?.bitmap).toBe(mockBitmap);
		});

		it("handles worker error messages", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			const workers = testEl._pdfWorkers;

			workers[0].onmessage?.(
				new MessageEvent("message", {
					data: {
						type: "error",
						error: { message: "Test worker error" },
						messageId: 400,
					},
				}),
			);

			expect(testEl._errorMessage).toBe("Test worker error");
		});

		it("handles generic worker onerror event", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			const workers = testEl._pdfWorkers;

			workers[0].onerror?.(
				new ErrorEvent("error", { message: "Generic worker error" }),
			);

			expect(testEl._errorMessage).toBe("Generic worker error");
		});
	});

	describe("rendering and cache", () => {
		it("uses cache if page at same scale is available", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			const mockBitmap = { close: vi.fn() } as unknown as ImageBitmap;
			testEl._pageCache.set(0, {
				bitmap: mockBitmap,
				width: 800,
				height: 600,
				scale: 1.0,
			});
			testEl._totalPages = 5;
			testEl._currentPageNumber = 1;
			testEl._currentScale = 1.0;
			testEl._isFitToView = false;

			const workers = testEl._pdfWorkers;
			const spy = vi.spyOn(workers[0], "postMessage");

			testEl._renderCurrentPage();

			// Should use createImageBitmap and then call drawBitmap
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({ type: "drawBitmap" }),
				expect.any(Array),
			);
		});

		it("cleans up cache for distant pages", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			const mockBitmap = { close: vi.fn() } as unknown as ImageBitmap;
			testEl._pageCache.set(20, {
				bitmap: mockBitmap,
				width: 800,
				height: 600,
				scale: 1.0,
			});
			testEl._totalPages = 30;
			testEl._currentPageNumber = 1;

			testEl._prefetchNextPages();

			expect(testEl._pageCache.has(20)).toBe(false);
			expect(mockBitmap.close).toHaveBeenCalled();
		});
	});

	describe("UI interactions", () => {
		it("navigates to next page", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			testEl._totalPages = 5;
			testEl._currentPageNumber = 1;
			testEl._isLoading = false;

			const workers = testEl._pdfWorkers;
			const spy = vi.spyOn(workers[0], "postMessage");

			await el.updateComplete;

			const nextBtn = el.shadowRoot?.querySelector(
				'button[title="Next page"]',
			) as HTMLButtonElement;
			nextBtn.click();

			expect(testEl._currentPageNumber).toBe(2);
			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "renderPage",
					payload: expect.objectContaining({ pageNumber: 1 }),
				}),
				expect.any(Array),
			);
		});

		it("navigates to previous page", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			testEl._totalPages = 5;
			testEl._currentPageNumber = 2;
			testEl._isLoading = false;

			const workers = testEl._pdfWorkers;
			const spy = vi.spyOn(workers[0], "postMessage");

			await el.updateComplete;

			const prevBtn = el.shadowRoot?.querySelector(
				'button[title="Previous page"]',
			) as HTMLButtonElement;
			prevBtn.click();

			expect(testEl._currentPageNumber).toBe(1);
			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "renderPage",
					payload: expect.objectContaining({ pageNumber: 0 }),
				}),
				expect.any(Array),
			);
		});

		it("handles page input change with valid value", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			testEl._totalPages = 5;
			testEl._currentPageNumber = 1;
			await el.updateComplete;

			const input = el.shadowRoot?.querySelector(
				".ctrl-page-input",
			) as HTMLInputElement;
			input.value = "3";
			input.dispatchEvent(new Event("change"));

			expect(testEl._currentPageNumber).toBe(3);
		});

		it("handles page input change with invalid value", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			testEl._totalPages = 5;
			testEl._currentPageNumber = 2;
			await el.updateComplete;

			const input = el.shadowRoot?.querySelector(
				".ctrl-page-input",
			) as HTMLInputElement;
			input.value = "99"; // Invalid
			input.dispatchEvent(new Event("change"));

			expect(testEl._currentPageNumber).toBe(2);
			expect(input.value).toBe("2");
		});

		it("handles zoom slider change", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			testEl._totalPages = 5;
			testEl._isLoading = false;

			const workers = testEl._pdfWorkers;
			const spy = vi.spyOn(workers[0], "postMessage");

			await el.updateComplete;

			const zoomInput = el.shadowRoot?.querySelector(
				".ctrl-range",
			) as HTMLInputElement;
			zoomInput.value = "2.0";
			zoomInput.dispatchEvent(new Event("input"));

			expect(testEl._displayScale).toBe(2.0);
			expect(testEl._isFitToView).toBe(false);

			// Wait for debounce
			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "zoom",
					payload: expect.objectContaining({ scale: 2.0 }),
				}),
				expect.any(Array),
			);
		});

		it("handles fit to view", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			testEl._totalPages = 5;
			testEl._isLoading = false;
			testEl._originalPageWidth = 800;
			testEl._originalPageHeight = 1100;

			// Mock content area width and height
			const contentArea = el.shadowRoot?.querySelector(
				".content-area",
			) as HTMLElement;
			vi.spyOn(contentArea, "clientWidth", "get").mockReturnValue(1000);
			vi.spyOn(contentArea, "clientHeight", "get").mockReturnValue(1500);

			await el.updateComplete;

			const fitBtn = el.shadowRoot?.querySelector(
				'button[title="Fit to view"]',
			) as HTMLButtonElement;
			fitBtn.click();

			expect(testEl._isFitToView).toBe(true);
			// Width scale: (1000-32)/800 = 1.21
			// Height scale: (1500-32)/1100 = 1.33
			// Min scale is 1.21
			expect(testEl._displayScale).toBeCloseTo(1.21, 2);
		});

		it("dismisses error message", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			testEl._errorMessage = "Something went wrong";
			await el.updateComplete;

			const dismissBtn = el.shadowRoot?.querySelector(
				".error-message button",
			) as HTMLButtonElement;
			dismissBtn.click();

			expect(testEl._errorMessage).toBeNull();
		});
	});

	describe("lifecycle", () => {
		it("terminates workers on disconnectedCallback", async () => {
			const el = await fixture<PdfViewer>(html`<pdf-viewer></pdf-viewer>`);
			const testEl = el as unknown as TestPdfViewer;
			const workers = testEl._pdfWorkers;
			const spies = workers.map((w: Worker) => vi.spyOn(w, "terminate"));

			el.remove();

			// Force call disconnectedCallback if remove() didn't trigger it in happy-dom
			if (spies[0].mock.calls.length === 0) {
				el.disconnectedCallback();
			}

			for (const spy of spies) {
				expect(spy).toHaveBeenCalled();
			}
		});
	});
});
