import ePub, { Book, Rendition } from "epubjs";

export type EpubFlowType =
  | "paginated" // Traditional paginated view
  | "scrolled" // Basic scrolled view
  | "scrolled-continuous"; // Continuous scrolling with preloading

export interface NavItem {
  id: string;
  href: string;
  label: string;
  subitems?: NavItem[];
}

export interface RenditionOptions {
  width: number;
  height: number;
  flow?: EpubFlowType;
  styles?: {
    [key: string]: string;
  };
}

export interface EpubViewerSettings {
  fontSize: number;
  theme: "light" | "dark" | "sepia";
  flowType: EpubFlowType;
}

const STORAGE_KEY = "epub-viewer-settings";

export function loadSettings(): EpubViewerSettings {
  const defaultSettings: EpubViewerSettings = {
    fontSize: 100,
    theme: "light",
    flowType: "paginated",
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }

  return defaultSettings;
}

export function saveSettings(settings: EpubViewerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

export class EpubManager {
  private book: Book | null = null;
  protected rendition: Rendition | null = null; // Changed to protected
  private documentId: string | null = null;
  private currentFlow: EpubFlowType = "paginated";

  async loadBook(epubBuffer: ArrayBuffer): Promise<{
    documentId: string;
    toc: NavItem[];
    totalPages: number;
    rawBook: Book;
  }> {
    // Clean up existing book if any
    if (this.book) {
      this.destroy();
    }

    try {
      // Initialize the book with the ArrayBuffer
      this.book = ePub(epubBuffer);
      this.documentId = `epub-doc-${Date.now()}`;

      if (!this.book) {
        throw new Error("Failed to instantiate EPUB Book.");
      }

      // Wait for the book to be ready
      await this.book.ready;

      // Get spine count
      let spineCount = 0;
      this.book.spine.each(() => {
        spineCount++;
      });

      // Get table of contents
      const toc = this.book.navigation.toc;

      return {
        documentId: this.documentId,
        toc,
        totalPages: spineCount,
        rawBook: this.book,
      };
    } catch (error) {
      if (this.book) {
        this.destroy();
      }
      throw new Error(
        `Failed to load book: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async createRendition(
    element: HTMLElement,
    options: RenditionOptions
  ): Promise<void> {
    if (!this.book) {
      throw new Error("No book loaded");
    }

    // Cleanup existing rendition if any
    if (this.rendition) {
      this.rendition.destroy();
    }

    this.currentFlow = options.flow || "paginated";

    // Store current location if re-rendering
    const currentLocation = this.rendition?.location?.start?.cfi;

    const renditionOptions = {
      width: options.width,
      height:
        this.currentFlow === "scrolled-continuous" ? undefined : options.height,
      spread: "none",
      flow: this.currentFlow,
      infinite: this.currentFlow === "scrolled-continuous",
      manager:
        this.currentFlow === "scrolled-continuous" ? "continuous" : "default",
    };

    this.rendition = this.book.renderTo(element, renditionOptions);

    // Apply any custom styles if provided
    if (options.styles) {
      Object.entries(options.styles).forEach(([property, value]) => {
        this.rendition?.themes.default({ [property]: value });
      });
    }

    // Display at the stored location or start from beginning
    await this.rendition.display(currentLocation);

    // Set up keyboard navigation for paginated mode
    if (this.currentFlow === "paginated") {
      this.rendition.on("keyup", (event: KeyboardEvent) => {
        if (event.key === "ArrowRight") {
          this.rendition?.next();
        }
        if (event.key === "ArrowLeft") {
          this.rendition?.prev();
        }
      });
    }

    // Add extra styling for continuous mode
    if (this.currentFlow === "scrolled-continuous") {
      const style = document.createElement("style");
      style.innerHTML = `
        .epub-container iframe {
          border: none !important;
          margin: 0 !important;
        }
        .epub-container > div {
          margin: 0 !important;
          padding: 0 !important;
        }
      `;
      element.appendChild(style);
    }
  }

  async setFlowType(
    flowType: EpubFlowType,
    element: HTMLElement,
    options: RenditionOptions
  ): Promise<void> {
    if (flowType !== this.currentFlow) {
      const currentLocation = this.rendition?.location;
      await this.createRendition(element, { ...options, flow: flowType });
      if (currentLocation) {
        await this.rendition?.display(currentLocation.start.cfi);
      }
    }
  }

  async renderPage(pageNumber: number): Promise<string> {
    if (!this.book || !this.book.spine) {
      throw new Error("No book loaded or spine not available");
    }

    let spineItem: any = null;
    let currentIndex = 0;
    this.book.spine.each((item: any) => {
      if (currentIndex === pageNumber - 1) {
        spineItem = item;
      }
      currentIndex++;
    });

    if (!spineItem) {
      throw new Error(`Spine item not found for page ${pageNumber}`);
    }

    if (this.rendition) {
      await this.rendition.display(spineItem.href);
      return ""; // Content is handled by the rendition
    } else {
      const content = await spineItem.load();
      return typeof content === "string" ? content : content.toString();
    }
  }

  async nextPage(): Promise<void> {
    if (this.rendition) {
      await this.rendition.next();
    }
  }

  async prevPage(): Promise<void> {
    if (this.rendition) {
      await this.rendition.prev();
    }
  }

  destroy() {
    if (this.rendition) {
      this.rendition.destroy();
      this.rendition = null;
    }
    if (this.book) {
      this.book.destroy();
      this.book = null;
      this.documentId = null;
    }
  }

  get currentDocumentId(): string | null {
    return this.documentId;
  }

  getPageFromHref(href: string): number {
    if (!this.book || !this.book.spine) {
      return -1;
    }

    let index = -1;
    this.book.spine.each((item: any, i: number) => {
      if (item.href === href) {
        index = i;
      }
    });
    return index;
  }

  getCurrentLocation(): string | null {
    if (!this.rendition) {
      return null;
    }
    const location = this.rendition.location;
    return location?.start?.cfi || null;
  }

  async goToLocation(cfi: string): Promise<void> {
    if (this.rendition) {
      await this.rendition.display(cfi);
    }
  }

  isLoaded(): boolean {
    return !!this.rendition;
  }

  setFontSize(fontSize: string): void {
    if (this.rendition) {
      this.rendition.themes.default({
        "font-size": fontSize,
      });
    }
  }

  updateTheme(theme: "light" | "dark" | "sepia"): void {
    if (!this.rendition) return;

    // Reset previous theme styles
    this.rendition.themes.default({
      color: "",
      "background-color": "",
      "font-size": "",
    });

    // Apply new theme styles
    switch (theme) {
      case "dark":
        this.rendition.themes.default({
          color: "#ffffff",
          "background-color": "#1a1a1a",
        });
        break;
      case "sepia":
        this.rendition.themes.default({
          color: "#5f4b32",
          "background-color": "#f4ecd8",
        });
        break;
      case "light":
      default:
        this.rendition.themes.default({
          color: "#000000",
          "background-color": "#ffffff",
        });
        break;
    }
  }

  updateFontSize(fontSize: number): void {
    if (!this.rendition) return;
    this.rendition.themes.default({
      "font-size": `${fontSize}%`,
    });
  }
}
