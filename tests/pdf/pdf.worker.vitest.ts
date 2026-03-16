import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock @hyzyla/pdfium
const mockPage = {
	getOriginalSize: vi
		.fn()
		.mockReturnValue({ originalWidth: 800, originalHeight: 600 }),
	render: vi.fn().mockResolvedValue({
		data: { buffer: new Uint8Array([1, 2, 3, 4]).buffer },
	}),
};

const mockDocument = {
	getPageCount: vi.fn().mockReturnValue(10),
	getPage: vi.fn().mockReturnValue(mockPage),
};

const mockLibrary = {
	loadDocument: vi.fn().mockResolvedValue(mockDocument),
};

vi.mock("@hyzyla/pdfium", () => ({
	PDFiumLibrary: {
		init: vi.fn().mockResolvedValue(mockLibrary),
	},
}));

// Mock browser globals
class MockImageData {
	data: Uint8ClampedArray;
	width: number;
	height: number;
	constructor(data: Uint8ClampedArray, width: number, height: number) {
		this.data = data;
		this.width = width;
		this.height = height;
	}
}
globalThis.ImageData = MockImageData as unknown as typeof ImageData;

class MockImageBitmap {
	width = 0;
	height = 0;
	close = vi.fn();
}
globalThis.ImageBitmap = MockImageBitmap as unknown as typeof ImageBitmap;

globalThis.createImageBitmap = vi
	.fn()
	.mockImplementation((imageData: { width: number; height: number }) => {
		const bitmap = new MockImageBitmap();
		bitmap.width = imageData.width;
		bitmap.height = imageData.height;
		return Promise.resolve(bitmap);
	});

describe("pdf.worker", () => {
	let onmessage: (event: { data: unknown }) => Promise<void>;
	let postMessageSpy: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		postMessageSpy = vi.fn();
		// Set up mock self before importing the worker
		const mockSelf = {
			postMessage: postMessageSpy,
			onmessage: null as ((event: { data: unknown }) => Promise<void>) | null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		};
		globalThis.self = mockSelf as unknown as Window & typeof globalThis;

		// Re-import the worker to get fresh state and register onmessage
		vi.resetModules();
		await import("../../src/components/pdf/workers/pdf.worker");
		onmessage = (globalThis.self as unknown as { onmessage: typeof onmessage })
			.onmessage;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("handles 'init' message", async () => {
		await onmessage({
			data: { type: "init", payload: { wasmUrl: "mock.wasm" }, messageId: 1 },
		});

		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "libraryInitialized",
				success: true,
				messageId: 1,
			}),
		);
	});

	it("handles 'initCanvas' message", async () => {
		const mockCanvas = {
			getContext: vi.fn().mockReturnValue({}),
		};
		await onmessage({
			data: {
				type: "initCanvas",
				payload: { canvas: mockCanvas },
				messageId: 2,
			},
		});
		// No response expected, just internal state update
	});

	it("handles 'loadPdf' message", async () => {
		// First init
		await onmessage({
			data: { type: "init", payload: { wasmUrl: "mock.wasm" }, messageId: 1 },
		});

		const buffer = new Uint8Array([0x25, 0x50]).buffer;
		await onmessage({
			data: {
				type: "loadPdf",
				payload: { pdfBuffer: buffer, documentId: "test-doc" },
				messageId: 3,
			},
		});

		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "pdfLoaded",
				pageCount: 10,
				success: true,
				messageId: 3,
			}),
		);
	});

	it("handles 'renderPage' message", async () => {
		// Setup: init and load
		await onmessage({
			data: { type: "init", payload: { wasmUrl: "mock.wasm" }, messageId: 1 },
		});
		await onmessage({
			data: {
				type: "loadPdf",
				payload: { pdfBuffer: new ArrayBuffer(0) },
				messageId: 2,
			},
		});

		await onmessage({
			data: {
				type: "renderPage",
				payload: { pageNumber: 0, scale: 1.0 },
				messageId: 4,
			},
		});

		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "pageRendered",
				success: true,
				pageNumber: 0,
				scale: 1.0,
				messageId: 4,
			}),
		);
	});

	it("handles 'renderToBitmap' message", async () => {
		await onmessage({
			data: { type: "init", payload: { wasmUrl: "mock.wasm" }, messageId: 1 },
		});
		await onmessage({
			data: {
				type: "loadPdf",
				payload: { pdfBuffer: new ArrayBuffer(0) },
				messageId: 2,
			},
		});

		await onmessage({
			data: {
				type: "renderToBitmap",
				payload: { pageNumber: 1, scale: 2.0 },
				messageId: 5,
			},
		});

		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "pageToBitmap",
				success: true,
				pageNumber: 1,
				scale: 2.0,
				messageId: 5,
			}),
			expect.any(Array),
		);
	});

	it("handles 'drawBitmap' message", async () => {
		const mockContext = {
			drawImage: vi.fn(),
		};
		const mockCanvas = {
			getContext: vi.fn().mockReturnValue(mockContext),
		};

		// Init canvas
		await onmessage({
			data: {
				type: "initCanvas",
				payload: { canvas: mockCanvas },
				messageId: 0,
			},
		});

		const mockBitmap = new MockImageBitmap();
		await onmessage({
			data: {
				type: "drawBitmap",
				payload: {
					bitmap: mockBitmap,
					width: 800,
					height: 600,
					pageNumber: 0,
					scale: 1.0,
				},
				messageId: 6,
			},
		});

		expect(mockContext.drawImage).toHaveBeenCalledWith(mockBitmap, 0, 0);
		expect(mockBitmap.close).toHaveBeenCalled();
		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "pageRendered",
				success: true,
				messageId: 6,
			}),
		);
	});

	it("handles 'renderPage' message with fitMode", async () => {
		await onmessage({
			data: { type: "init", payload: { wasmUrl: "mock.wasm" }, messageId: 1 },
		});
		await onmessage({
			data: {
				type: "loadPdf",
				payload: { pdfBuffer: new ArrayBuffer(0) },
				messageId: 2,
			},
		});

		await onmessage({
			data: {
				type: "renderPage",
				payload: { pageNumber: 0, fitMode: "width", containerWidth: 1000 },
				messageId: 4,
			},
		});

		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "pageRendered",
				success: true,
				scale: 1.25, // 1000 / 800
				messageId: 4,
			}),
		);
	});

	it("handles 'renderToBitmap' error when no doc loaded", async () => {
		await onmessage({
			data: {
				type: "renderToBitmap",
				payload: { pageNumber: 1, scale: 2.0 },
				messageId: 5,
			},
		});
		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({ type: "error" }),
		);
	});

	it("handles 'drawBitmap' error when no canvas initialized", async () => {
		await onmessage({
			data: {
				type: "drawBitmap",
				payload: {
					bitmap: new MockImageBitmap(),
					width: 800,
					height: 600,
					pageNumber: 0,
					scale: 1.0,
				},
				messageId: 6,
			},
		});
		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({ type: "error" }),
		);
	});

	it("handles 'zoom' message with fitMode", async () => {
		await onmessage({
			data: { type: "init", payload: { wasmUrl: "mock.wasm" }, messageId: 1 },
		});
		await onmessage({
			data: {
				type: "loadPdf",
				payload: { pdfBuffer: new ArrayBuffer(0) },
				messageId: 2,
			},
		});

		await onmessage({
			data: {
				type: "zoom",
				payload: { fitMode: "width", containerWidth: 1600 },
				messageId: 7,
			},
		});

		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "pageRendered",
				scale: 2.0, // 1600 / 800
				messageId: 7,
			}),
		);
	});

	it("handles 'zoom' error when no scale provided", async () => {
		await onmessage({
			data: { type: "init", payload: { wasmUrl: "mock.wasm" }, messageId: 1 },
		});
		await onmessage({
			data: {
				type: "loadPdf",
				payload: { pdfBuffer: new ArrayBuffer(0) },
				messageId: 2,
			},
		});
		await onmessage({ data: { type: "zoom", payload: {}, messageId: 8 } });
		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({ type: "error" }),
		);
	});

	it("handles unknown message type", async () => {
		await onmessage({ data: { type: "unknown", messageId: 9 } });
		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({ type: "error" }),
		);
	});

	it("handles 'loadPdf' with Uint8Array buffer", async () => {
		await onmessage({
			data: { type: "init", payload: { wasmUrl: "mock.wasm" }, messageId: 1 },
		});
		const uint8Array = new Uint8Array([0x25, 0x50]);
		await onmessage({
			data: {
				type: "loadPdf",
				payload: { pdfBuffer: uint8Array },
				messageId: 2,
			},
		});
		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({ type: "pdfLoaded" }),
		);
	});

	it("handles 'loadPdf' with invalid buffer type", async () => {
		await onmessage({
			data: { type: "init", payload: { wasmUrl: "mock.wasm" }, messageId: 1 },
		});
		await onmessage({
			data: {
				type: "loadPdf",
				payload: { pdfBuffer: {} },
				messageId: 3,
			},
		});
		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "error",
				error: expect.objectContaining({
					message: expect.stringContaining("Invalid PDF buffer type"),
				}),
			}),
		);
	});

	it("handles 'loadPdf' with zero pages", async () => {
		await onmessage({
			data: { type: "init", payload: { wasmUrl: "mock.wasm" }, messageId: 1 },
		});
		mockDocument.getPageCount.mockReturnValueOnce(0);
		await onmessage({
			data: {
				type: "loadPdf",
				payload: { pdfBuffer: new ArrayBuffer(0) },
				messageId: 4,
			},
		});
		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "error",
				error: expect.objectContaining({
					message: expect.stringContaining("contains no pages"),
				}),
			}),
		);
	});

	it("handles 'loadPdf' failure during loadDocument", async () => {
		await onmessage({
			data: { type: "init", payload: { wasmUrl: "mock.wasm" }, messageId: 1 },
		});
		mockLibrary.loadDocument.mockRejectedValueOnce(new Error("Load failed"));
		await onmessage({
			data: {
				type: "loadPdf",
				payload: { pdfBuffer: new ArrayBuffer(0) },
				messageId: 5,
			},
		});
		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "error",
				error: expect.objectContaining({ message: "Load failed" }),
			}),
		);
	});

	it("handles 'zoom' error when no doc loaded", async () => {
		await onmessage({
			data: {
				type: "zoom",
				payload: { scale: 1.5 },
				messageId: 6,
			},
		});
		expect(postMessageSpy).toHaveBeenCalledWith(
			expect.objectContaining({ type: "error" }),
		);
	});

	it("handles unhandledrejection", () => {
		const event = {
			reason: "test error",
		};
		const self = globalThis.self as unknown as {
			addEventListener: { mock: { calls: [string, (e: unknown) => void][] } };
		};
		const unhandledRejectionCall = self.addEventListener.mock.calls.find(
			(call) => call[0] === "unhandledrejection",
		);
		if (unhandledRejectionCall) {
			const handler = unhandledRejectionCall[1];
			handler(event);
			expect(postMessageSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "error",
					message: expect.stringContaining("test error"),
				}),
			);
		}
	});
});
