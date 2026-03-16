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
import { CbzViewer } from "@quincarter/document-viewer/components/cbz/cbz-viewer";
import { EpubViewer } from "@quincarter/document-viewer/components/epub/epub-viewer";
import { PdfViewer } from "@quincarter/document-viewer/components/pdf/pdf-viewer";
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
import { CbzViewer } from "@quincarter/document-viewer/components/cbz/CbzViewer";
import { EpubViewer } from "@quincarter/document-viewer/components/epub/EpubViewer";
import { PdfViewer } from "@quincarter/document-viewer/components/pdf/PdfViewer";

// Define your own custom elements
customElements.define("my-cbz-viewer", CbzViewer);
customElements.define("my-epub-viewer", EpubViewer);
customElements.define("my-pdf-viewer", PdfViewer);

// Use in HTML with your custom names
<my-cbz-viewer src="path/to/comic.cbz"></my-cbz-viewer>;
```

You can also use the classes directly in your code:

```typescript
// Programmatic usage
const cbzViewer = document.createElement("cbz-viewer");
cbzViewer.src = "path/to/comic.cbz";
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

### Screenshots

#### PDF Viewer
<img width="1710" height="1273" alt="msedge_45Q32r3TuT" src="https://github.com/user-attachments/assets/53a276b4-065d-403a-a2ce-3e8ebbd9db76" />
<img width="1710" height="1273" alt="msedge_4YXWUL7zfP" src="https://github.com/user-attachments/assets/a94d9568-400e-49fc-a5a2-4ae99b77c14a" />
<img width="1710" height="1273" alt="msedge_uIykNjO55Z" src="https://github.com/user-attachments/assets/338f4625-714f-44ed-a9b5-10cdaa54d4f0" />

##### PDF Controls
<img width="456" height="96" alt="image" src="https://github.com/user-attachments/assets/b96b41cc-02e6-4825-8b94-2d1a65ca4b43" />

#### CBZ Viewer (Comic Books)
![msedge_xc6ho0nxfY](https://github.com/user-attachments/assets/5a4c7b22-e581-4575-a07b-08d0d31be0eb)
![msedge_2U9BWsh0M0](https://github.com/user-attachments/assets/3ab35d01-c7d9-40bf-a286-19d2aecd134f)
<img width="1710" height="1273" alt="msedge_qO5yJUaFCR" src="https://github.com/user-attachments/assets/5fa46c89-efaf-4165-ab23-f77b4370d22a" />
![msedge_jbKdyq8ZcG](https://github.com/user-attachments/assets/efd345c3-21d8-49c1-82c1-0b8bc92ded4c)

##### CBZ Controls
<img width="215" height="63" alt="image" src="https://github.com/user-attachments/assets/3bdc7085-6555-40d0-8a93-ea3a425d0023" />


#### ePub Viewer
![msedge_W6QUXUBGPq](https://github.com/user-attachments/assets/6dd0da94-ce13-4351-8b5b-5b61bdf8f46a)
<img width="1710" height="1273" alt="msedge_h8DVz1ozJQ" src="https://github.com/user-attachments/assets/b8c8fa80-5943-4760-a56d-4c535cdf3ecc" />
<img width="1710" height="1273" alt="msedge_1yas5xg6Jz" src="https://github.com/user-attachments/assets/b498797e-e0dd-4cd1-a758-423c827c4f5f" />

##### ePub Controls
<img width="376" height="309" alt="image" src="https://github.com/user-attachments/assets/0841df02-033e-495d-9ec0-7111e1c84ecd" />


## Development

```bash
yarn && yarn start
```

### Building

```bash
yarn build
```
