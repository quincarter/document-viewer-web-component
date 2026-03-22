import { html, LitElement } from "lit";
import { property, state } from "lit/decorators.js";

// Import viewers
import "./pdf/pdf-viewer";
import "./epub/epub-viewer";
import "./cbz/cbz-viewer";
import "./tiff/TiffViewer";
import { DocumentViewerStyles } from "./document-viewer.styles";

type SupportedFileType = "pdf" | "epub" | "cbz" | "tiff" | "unknown";

export class DocumentRouter extends LitElement {
	@property({ type: String })
	src?: string;

	static styles = [DocumentViewerStyles];

	@state()
	private fileType: SupportedFileType = "unknown";

	@state()
	private error: string | null = null;

	protected async updated(changedProperties: Map<string, unknown>) {
		if (changedProperties.has("src") && this.src) {
			await this.determineFileType();
		}
	}

	private async determineFileType() {
		if (!this.src) {
			this.fileType = "unknown";
			return;
		}

		try {
			const response = await fetch(this.src);
			if (!response.ok) {
				throw new Error(`Failed to fetch file: ${response.statusText}`);
			}

			// Get the first few bytes to check file signatures
			const buffer = await response.arrayBuffer();
			const header = new Uint8Array(buffer.slice(0, 5));

			// Check for PDF signature (%PDF-)
			const isPDF =
				header[0] === 0x25 && // %
				header[1] === 0x50 && // P
				header[2] === 0x44 && // D
				header[3] === 0x46 && // F
				header[4] === 0x2d; // -

			// Check for TIFF signature
			// Little-endian: 49 49 2A 00
			// Big-endian: 4D 4D 00 2A
			// BigTIFF Little-endian: 49 49 2B 00
			// BigTIFF Big-endian: 4D 4D 00 2B
			const isTIFF =
				(header[0] === 0x49 &&
					header[1] === 0x49 &&
					(header[2] === 0x2a || header[2] === 0x2b) &&
					header[3] === 0x00) ||
				(header[0] === 0x4d &&
					header[1] === 0x4d &&
					header[2] === 0x00 &&
					(header[3] === 0x2a || header[3] === 0x2b));

			// Check for EPUB signature (PK\x03\x04 for ZIP, which EPUB uses)
			const isPKZip =
				buffer.byteLength > 58 &&
				String.fromCharCode(...new Uint8Array(buffer.slice(0, 4))) ===
					"PK\x03\x04";

			// Check the file extension if it's a ZIP-based format (EPUB or CBZ)
			const url = new URL(this.src, window.location.href);
			const extension = url.pathname.split(".").pop()?.toLowerCase();

			if (isPDF) {
				this.fileType = "pdf";
			} else if (isTIFF) {
				this.fileType = "tiff";
			} else if (isPKZip && extension === "epub") {
				this.fileType = "epub";
			} else if (isPKZip && extension === "cbz") {
				this.fileType = "cbz";
			} else {
				this.fileType = "unknown";
				this.error = "Unsupported file format";
			}
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
			this.fileType = "unknown";
		}
	}

	private renderViewer() {
		switch (this.fileType) {
			case "pdf":
				return html`<pdf-viewer .src=${this.src || null}></pdf-viewer>`;
			case "tiff":
				return html`<tiff-viewer .src=${this.src || null}></tiff-viewer>`;
			case "epub":
				return html`<epub-viewer .src=${this.src || null}></epub-viewer>`;
			case "cbz":
				return html`<cbz-viewer .src=${this.src}></cbz-viewer>`;
			case "unknown":
				return html`<div class="error">
          ${this.error ?? "Unknown or unsupported file format"}
        </div>`;
		}
	}

	render() {
		if (!this.src) {
			return html`<div class="error">No file provided</div>`;
		}

		return html`${this.renderViewer()}`;
	}
}
