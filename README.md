# Document Viewer Web Component

This project's goal is to give an all in one approach to rendering documents. Have you ever been overwhelemed developing a product that needs support for more than one file type? Well this document viewer should eventually be the go to for you once i build the remaining support for the remaining file types!

- The PDF Viewer is using a wasm binary for rendering that is highly optimized for rendering.
- The ePub viewer is written entirely in javascript and runs very fast, rendering pages as html for easy highlighting and manipulation.
- CBZ Files are basically just zipped image payloads arranged in order for a book to make sense. `jszip` is the secret sauce running in a web worker for this to be performant, which extracts images on the fly and renders them to the page.

## Support

Document support is as follows:

- PDF - Supported
- ePub - Supported
- CBZ (Comic Books) - Supported
- Office Files - Coming Soon (doc/docx/ppt/pptx)

## Usage

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
