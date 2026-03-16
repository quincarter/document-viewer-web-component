import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	EpubManager as EpubManagerType,
	EpubViewerSettings,
} from "../../src/components/epub/utils/epub-utils";

// We need to mock the epubjs module before importing the utils
vi.mock("epubjs", () => {
	return {
		default: vi.fn(() => ({
			ready: Promise.resolve(),
			spine: {
				each: vi.fn(),
			},
			navigation: {
				toc: [],
			},
			renderTo: vi.fn(() => ({
				display: vi.fn().mockResolvedValue(undefined),
				next: vi.fn().mockResolvedValue(undefined),
				prev: vi.fn().mockResolvedValue(undefined),
				destroy: vi.fn(),
				themes: {
					register: vi.fn(),
					default: vi.fn(),
					select: vi.fn(),
				},
				location: null,
				on: vi.fn(),
			})),
			destroy: vi.fn(),
		})),
	};
});

describe("epub-utils", () => {
	let EpubManager: typeof EpubManagerType;
	let loadSettings: () => EpubViewerSettings;
	let saveSettings: (settings: EpubViewerSettings) => void;

	beforeEach(async () => {
		// Clear localStorage before each test
		const storageKey = "epub-viewer-settings";
		globalThis.localStorage?.removeItem?.(storageKey);

		// Dynamic import to get fresh module
		const mod = await import("../../src/components/epub/utils/epub-utils");
		EpubManager = mod.EpubManager;
		loadSettings = mod.loadSettings;
		saveSettings = mod.saveSettings;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("loadSettings", () => {
		it("returns default settings when nothing stored", () => {
			const settings = loadSettings();
			expect(settings).toEqual({
				fontSize: 100,
				theme: "light",
				flowType: "paginated",
			});
		});

		it("merges stored settings with defaults", () => {
			localStorage.setItem(
				"epub-viewer-settings",
				JSON.stringify({ fontSize: 120, theme: "dark" }),
			);

			const settings = loadSettings();
			expect(settings.fontSize).toBe(120);
			expect(settings.theme).toBe("dark");
			expect(settings.flowType).toBe("paginated"); // default
		});

		it("handles invalid JSON gracefully", () => {
			localStorage.setItem("epub-viewer-settings", "not-json");

			const settings = loadSettings();
			expect(settings).toEqual({
				fontSize: 100,
				theme: "light",
				flowType: "paginated",
			});
		});
	});

	describe("saveSettings", () => {
		it("stores settings in localStorage", () => {
			const settings: EpubViewerSettings = {
				fontSize: 140,
				theme: "sepia",
				flowType: "scrolled-continuous",
			};

			saveSettings(settings);

			const storedRaw = localStorage.getItem("epub-viewer-settings");
			expect(storedRaw).not.toBeNull();
			const stored = JSON.parse(storedRaw as string);
			expect(stored.fontSize).toBe(140);
			expect(stored.theme).toBe("sepia");
			expect(stored.flowType).toBe("scrolled-continuous");
		});
	});

	describe("EpubManager", () => {
		it("can be instantiated", () => {
			const manager = new EpubManager();
			expect(manager).toBeDefined();
		});

		it("isLoaded returns false initially", () => {
			const manager = new EpubManager();
			expect(manager.isLoaded()).toBe(false);
		});

		it("currentDocumentId is null initially", () => {
			const manager = new EpubManager();
			expect(manager.currentDocumentId).toBeNull();
		});

		it("getCurrentLocation returns null when no rendition", () => {
			const manager = new EpubManager();
			expect(manager.getCurrentLocation()).toBeNull();
		});

		it("getPageFromHref returns -1 when no book", () => {
			const manager = new EpubManager();
			expect(manager.getPageFromHref("test.html")).toBe(-1);
		});

		it("destroy cleans up without error when nothing loaded", () => {
			const manager = new EpubManager();
			expect(() => manager.destroy()).not.toThrow();
		});

		it("loadBook creates a book and returns metadata", async () => {
			const manager = new EpubManager();
			const buffer = new ArrayBuffer(100);

			const result = await manager.loadBook(buffer);

			expect(result.documentId).toMatch(/^epub-doc-/);
			expect(result.toc).toEqual([]);
			expect(result.totalPages).toBe(0);
			expect(result.rawBook).toBeDefined();
		});

		it("loadBook sets documentId", async () => {
			const manager = new EpubManager();
			const buffer = new ArrayBuffer(100);

			await manager.loadBook(buffer);
			expect(manager.currentDocumentId).toMatch(/^epub-doc-/);
		});

		it("destroy cleans up after loadBook", async () => {
			const manager = new EpubManager();
			const buffer = new ArrayBuffer(100);

			await manager.loadBook(buffer);
			manager.destroy();

			expect(manager.currentDocumentId).toBeNull();
			expect(manager.isLoaded()).toBe(false);
		});

		it("updateFontSize does nothing without rendition", () => {
			const manager = new EpubManager();
			// Should not throw
			expect(() => manager.updateFontSize(120)).not.toThrow();
		});

		it("updateTheme does nothing without rendition", () => {
			const manager = new EpubManager();
			expect(() => manager.updateTheme("dark")).not.toThrow();
		});

		it("setFontSize does nothing without rendition", () => {
			const manager = new EpubManager();
			expect(() => manager.setFontSize("1.2em")).not.toThrow();
		});

		it("nextPage does nothing without rendition", async () => {
			const manager = new EpubManager();
			await expect(manager.nextPage()).resolves.toBeUndefined();
		});

		it("prevPage does nothing without rendition", async () => {
			const manager = new EpubManager();
			await expect(manager.prevPage()).resolves.toBeUndefined();
		});

		it("goToLocation does nothing without rendition", async () => {
			const manager = new EpubManager();
			await expect(
				manager.goToLocation("epubcfi(/6/2)"),
			).resolves.toBeUndefined();
		});

		it("createRendition throws when no book loaded", async () => {
			const manager = new EpubManager();
			const el = document.createElement("div");

			await expect(
				manager.createRendition(el, { width: 800, height: 600 }),
			).rejects.toThrow("No book loaded");
		});

		it("createRendition works after loadBook", async () => {
			const manager = new EpubManager();
			const buffer = new ArrayBuffer(100);
			await manager.loadBook(buffer);

			const el = document.createElement("div");
			await manager.createRendition(el, { width: 800, height: 600 });

			expect(manager.isLoaded()).toBe(true);
		});

		it("createRendition applies custom flow type", async () => {
			const manager = new EpubManager();
			const buffer = new ArrayBuffer(100);
			await manager.loadBook(buffer);

			const el = document.createElement("div");
			await manager.createRendition(el, {
				width: 800,
				height: 600,
				flow: "scrolled-continuous",
			});

			expect(manager.isLoaded()).toBe(true);
		});
	});
});
