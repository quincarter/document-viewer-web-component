# Document Viewer Web Component

This project's goal is to give an all in one approach to rendering documents. Have you ever been overwhelemed developing a product that needs support for more than one file type? Well this document viewer should eventually be the go to for you once i build the remaining support for the remaining file types!

- The PDF Viewer is using a wasm binary for rendering that is highly optimized for rendering. Faster than the PDF.js alternative.
- The ePub viewer is written entirely in javascript and runs very fast, rendering pages as html for easy highlighting and manipulation.
- CBZ Files are basically just zipped image payloads arranged in order for a book to make sense. `jszip` is the secret sauce running in a web worker for this to be performant, which extracts images on the fly and renders them to the page.

## Support

Document support is as follows:

- PDF - Supported
- ePub - Supported
- CBZ (Comic Books) - Supported
- Office Files - Coming Soon (doc/docx/ppt/pptx)

## Installation

### With NPM

```bash
npm i @quincarter/document-viewer
```

### With yarn

```bash
yarn add @quincarter/document-viewer
```

## Usage

### Importing

You can either use the all-in-one document viewer that auto-detects file types, or import individual viewers for specific file types:

#### All-in-one Document Viewer

```typescript
// Import the all-in-one document viewer
import "@quincarter/document-viewer";
```

```html
<!--Use in your HTML-->
<document-viewer src="path/to/your/document.pdf"></document-viewer>
```

#### Individual Viewers

You can import and use the pre-defined elements:

```typescript
// Import specific viewers as needed
import { CbzViewer } from '@quincarter/document-viewer/components/cbz/cbz-viewer';
import { EpubViewer } from '@quincarter/document-viewer/components/epub/epub-viewer';
import { PdfViewer } from '@quincarter/document-viewer/components/pdf/pdf-viewer';
```

```html
<!--Use in your HTML-->
<cbz-viewer src="path/to/comic.cbz"></cbz-viewer>
<epub-viewer src="path/to/book.epub"></epub-viewer>
<pdf-viewer src="path/to/document.pdf"></pdf-viewer>
```

Or define your own custom element names:

```typescript
// Import the classes (note: without the decorators)
import { CbzViewer } from '@quincarter/document-viewer/components/cbz/CbzViewer';
import { EpubViewer } from '@quincarter/document-viewer/components/epub/EpubViewer';
import { PdfViewer } from '@quincarter/document-viewer/components/pdf/PdfViewer';

// Define your own custom elements
customElements.define('my-cbz-viewer', CbzViewer);
customElements.define('my-epub-viewer', EpubViewer);
customElements.define('my-pdf-viewer', PdfViewer);

// Use in HTML with your custom names
<my-cbz-viewer src="path/to/comic.cbz"></my-cbz-viewer>
```

You can also use the classes directly in your code:

```typescript
// Programmatic usage
const cbzViewer = document.createElement('cbz-viewer');
cbzViewer.src = 'path/to/comic.cbz';
document.body.appendChild(cbzViewer);
```

Each viewer can be styled and configured independently:

```typescript
// CBZ Viewer Example
const cbzViewer = document.createElement("cbz-viewer");
cbzViewer.src = "path/to/comic.cbz";
// Enable dual-page mode programmatically through the controls
const controls = cbzViewer.shadowRoot.querySelector("cbz-controls");
controls.isDualPage = true;

// ePub Viewer Example
const epubViewer = document.createElement("epub-viewer");
epubViewer.src = "path/to/book.epub";
// Listen for chapter changes
epubViewer.addEventListener("chapter-changed", (e) => {
  console.log("Current chapter:", e.detail.chapter);
});

// PDF Viewer Example
const pdfViewer = document.createElement("pdf-viewer");
pdfViewer.src = "path/to/document.pdf";
// Set zoom level programmatically
pdfViewer.setZoom(1.5);
```

### Basic Usage

The Document Viewer Web Component can handle PDF, ePub, and CBZ files. Simply include the component in your HTML and provide a URL to your document:

```html
<!-- Basic usage -->
<document-viewer src="path/to/your/document.pdf"></document-viewer>
```

The component will automatically detect the file type based on the extension and use the appropriate viewer.

### PDF Files

```html
<document-viewer src="path/to/document.pdf"></document-viewer>
```

The PDF viewer supports:

- Smooth scrolling
- Page-by-page navigation
- Zoom controls
- Fast rendering using WebAssembly

### ePub Files

```html
<document-viewer src="path/to/book.epub"></document-viewer>
```

The ePub viewer supports:

- HTML-based rendering for crisp text
- Text selection and highlighting
- Chapter navigation
- Responsive layout

### CBZ (Comic Book) Files

```html
<document-viewer src="path/to/comic.cbz"></document-viewer>
```

The CBZ viewer supports:

- Single page mode
- Dual page spread mode (manga-style reading)
- Smooth page transitions
- Efficient image loading using Web Workers

### Styling

The component can be styled using CSS variables:

```css
document-viewer {
  /* Set the height and width as needed */
  height: 100vh;
  width: 100%;
}
```

## Development

```bash
yarn && yarn start
```

### Building

```bash
yarn build
```
