import { html } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fixture, fixtureCleanup } from "../helpers/index";
import "../../src/components/tiff/tiff-viewer";
import {
	TiffViewer,
	type WorkerMessage,
} from "../../src/components/tiff/TiffViewer";

/**
 * Type helper to access private/protected properties for testing
 */
interface TestTiffViewer extends TiffViewer {
	_currentPageNumber: number;
	_totalPages: number;
	_isLoading: boolean;
	_errorMessage: string | null;
	_tiffWorkers: Worker[];
	_canvas: HTMLCanvasElement;
	_handleWorkerMessage(data: WorkerMessage, workerName: string): void;
	_handleWorkerError(error: Event | ErrorEvent, workerName: string): void;
	_isInitialized: boolean;
	_pendingFileLoad: { source: string | File } | null;
	_displayScale: number;
	_currentScale: number;
	_originalPageWidth: number;
	_originalPageHeight: number;
	_isFitToView: boolean;
	_contentArea: HTMLElement;
	_pageCache: Map<
		number,
		{ bitmap: ImageBitmap; width: number; height: number; scale: number }
	>;
	_prefetchQueue: number[];
	_busyWorkers: Set<Worker>;
	_renderCurrentPage(): void;
	_prefetchNextPages(): void;
	_processPrefetchQueue(): void;
	_sendMessageToWorker(
		worker: Worker,
		type: string,
		payload: unknown,
		transferList?: Transferable[],
	): Promise<unknown>;
	_handleZoomChange(newScale: number): void;
	_handleFitToViewChange(
		fitMode: string,
		containerWidth: number,
		containerHeight: number,
	): void;
	_goToNextPage(): void;
}

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
};

// Mock OffscreenCanvas support
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

class MockWorker {
	onmessage: ((e: MessageEvent) => void) | null = null;
	onerror: ((e: ErrorEvent) => void) | null = null;
	postMessage = vi.fn();
	terminate = vi.fn();
}
vi.mock("../../src/components/tiff/workers/tiff.worker?worker&inline", () => ({
	default: MockWorker,
}));

describe("TiffViewer", () => {
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

	describe("initialization and cleanup", () => {
		it("is defined", () => {
			expect(TiffViewer).to.exist;
		});

		it("initializes workers on construction", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;
			expect(testEl._tiffWorkers.length).to.equal(4);
		});

		it("cleans up resources on disconnectedCallback", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;
			const workers = [...testEl._tiffWorkers];
			const terminateSpies = workers.map((w) => vi.spyOn(w, "terminate"));

			el.remove();

			for (const spy of terminateSpies) {
				expect(spy).toHaveBeenCalled();
			}
			expect(testEl._tiffWorkers.length).to.equal(0);
		});

		it("transfers canvas control to offscreen if supported", async () => {
			(
				HTMLCanvasElement.prototype as HTMLCanvasElementWithOffscreen
			).transferControlToOffscreen = vi
				.fn()
				.mockReturnValue(mockOffscreenCanvas);

			await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);

			expect(
				HTMLCanvasElement.prototype.transferControlToOffscreen,
			).toHaveBeenCalled();
		});
	});

	describe("worker communication", () => {
		it("handles libraryInitialized message and processes pending load", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;

			testEl._pendingFileLoad = { source: "test.tiff" };

			for (let i = 0; i < 4; i++) {
				testEl._handleWorkerMessage(
					{ type: "libraryInitialized", success: true },
					`TIFF-${i}`,
				);
			}

			expect(testEl._isInitialized).to.be.true;
			expect(globalThis.fetch).toHaveBeenCalledWith("test.tiff");
			expect(testEl._pendingFileLoad).to.be.null;
		});

		it("handles tiffLoaded message", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;

			testEl._handleWorkerMessage(
				{
					type: "tiffLoaded",
					success: true,
					pageCount: 10,
					documentId: "test-doc",
				},
				"TIFF-0",
			);

			expect(testEl._totalPages).to.equal(10);
			expect(testEl._isLoading).to.be.false;
		});

		it("handles worker error messages", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;

			testEl._handleWorkerMessage(
				{ type: "error", error: { message: "Test error" } },
				"TIFF-0",
			);

			expect(testEl._errorMessage).to.contain("Test error");
		});

		it("handles worker onerror events", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;

			testEl._handleWorkerError(
				new ErrorEvent("error", { message: "Critical error" }),
				"TIFF-0",
			);

			expect(testEl._errorMessage).to.contain("Critical error");
		});
	});

	describe("rendering and caching", () => {
		it("uses cache if scale matches and not in fit mode", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;
			const mockBitmap = { close: vi.fn() } as unknown as ImageBitmap;

			testEl._pageCache.set(0, {
				bitmap: mockBitmap,
				width: 800,
				height: 600,
				scale: 1.0,
			});
			testEl._totalPages = 5;
			testEl._currentPageNumber = 1;
			testEl._displayScale = 1.0;
			testEl._isFitToView = false;

			const spy = vi.spyOn(testEl._tiffWorkers[0], "postMessage");

			testEl._renderCurrentPage();

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(globalThis.createImageBitmap).toHaveBeenCalled();
			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({ type: "drawBitmap" }),
				expect.any(Array),
			);
		});

		it("bypasses cache when fit-to-view is enabled", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;
			const mockBitmap = { close: vi.fn() } as unknown as ImageBitmap;

			testEl._pageCache.set(0, {
				bitmap: mockBitmap,
				width: 800,
				height: 600,
				scale: 1.0,
			});
			testEl._totalPages = 5;
			testEl._currentPageNumber = 1;
			testEl._isFitToView = true;

			const spy = vi.spyOn(testEl._tiffWorkers[0], "postMessage");

			testEl._renderCurrentPage();

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "renderPage",
					payload: expect.objectContaining({ fitMode: "page" }),
				}),
				expect.any(Array),
			);
		});

		it("stores rendered bitmaps in cache via pageToBitmap message", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;
			const mockBitmap = { close: vi.fn() } as unknown as ImageBitmap;

			testEl._handleWorkerMessage(
				{
					type: "pageToBitmap",
					success: true,
					pageNumber: 2,
					bitmap: mockBitmap,
					width: 100,
					height: 100,
					scale: 1.0,
				},
				"TIFF-1",
			);

			expect(testEl._pageCache.has(2)).to.be.true;
			expect(testEl._pageCache.get(2)?.bitmap).to.equal(mockBitmap);
		});
	});

	describe("prefetching", () => {
		it("populates prefetch queue and starts processing", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;

			testEl._totalPages = 20;
			testEl._currentPageNumber = 1;
			testEl._displayScale = 1.0;
			testEl._pageCache.clear();
			testEl._prefetchQueue = [];

			for (const worker of testEl._tiffWorkers) {
				vi.spyOn(worker, "postMessage").mockImplementation(() => {});
			}

			testEl._prefetchNextPages();

			expect(testEl._prefetchQueue.length).to.be.greaterThan(0);
		});

		it("processes prefetch queue using available workers", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;

			testEl._prefetchQueue = [5, 6];
			const workers = testEl._tiffWorkers;
			const spy1 = vi.spyOn(workers[1], "postMessage");

			testEl._processPrefetchQueue();

			expect(spy1).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "renderToBitmap",
					payload: expect.objectContaining({ pageNumber: 5 }),
				}),
				expect.any(Array),
			);
			expect(testEl._busyWorkers.has(workers[1])).to.be.true;
		});
	});

	describe("file loading", () => {
		it("handles File objects", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;

			testEl._isInitialized = true;

			const mockFile = new File([new ArrayBuffer(10)], "test.tiff", {
				type: "image/tiff",
			});
			mockFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(10));

			// Mock postMessage to capture messageIds and respond manually
			for (const worker of testEl._tiffWorkers) {
				vi.spyOn(worker, "postMessage").mockImplementation((msg: unknown) => {
					const workerMsg = msg as { type: string; messageId: number };
					if (workerMsg.type === "loadTiff") {
						Promise.resolve().then(() => {
							testEl._handleWorkerMessage(
								{
									type: "tiffLoaded",
									success: true,
									messageId: workerMsg.messageId,
								},
								"TIFF-0",
							);
						});
					}
				});
			}

			await testEl._loadFile(mockFile);

			expect(mockFile.arrayBuffer).toHaveBeenCalled();
		});

		it("handles fetch errors gracefully", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;

			testEl._isInitialized = true;

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				statusText: "Not Found",
			} as Response);

			await testEl._loadFile("missing.tiff");

			expect(testEl._errorMessage).to.contain("Failed to fetch file");
			expect(testEl._isLoading).to.be.false;
		});
	});

	describe("zoom and fit", () => {
		it("resets cache on zoom change", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;
			const mockBitmap = { close: vi.fn() } as unknown as ImageBitmap;

			testEl._pageCache.set(0, {
				bitmap: mockBitmap,
				width: 100,
				height: 100,
				scale: 1.0,
			});

			testEl._handleZoomChange(2.0);

			expect(mockBitmap.close).toHaveBeenCalled();
			expect(testEl._pageCache.size).to.equal(0);
		});

		it("sends zoom message to worker on fit change", async () => {
			const el = await fixture<TiffViewer>(html`<tiff-viewer></tiff-viewer>`);
			const testEl = el as unknown as TestTiffViewer;
			const spy = vi.spyOn(testEl._tiffWorkers[0], "postMessage");

			testEl._handleFitToViewChange("page", 1000, 800);

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "zoom",
					payload: expect.objectContaining({
						fitMode: "page",
						containerWidth: 1000,
						containerHeight: 800,
					}),
				}),
				expect.any(Array),
			);
		});
	});
});
