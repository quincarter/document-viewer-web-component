# PDF Viewer Testing Plan

## Objective
Increase test coverage for `PdfViewer.ts` and `pdf.worker.ts` to above 85% by implementing comprehensive unit and integration tests.

## Key Files & Context
- `src/components/pdf/PdfViewer.ts`: The main Lit component for PDF viewing.
- `src/components/pdf/workers/pdf.worker.ts`: Web worker handling PDFium WASM calls and rendering.
- `tests/pdf/pdf-viewer.test.ts`: Existing (minimal) tests for the component.
- `tests/pdf/pdf.worker.vitest.ts`: New test file for the worker logic.

## Implementation Steps

### 1. Component Tests (`tests/pdf/pdf-viewer.test.ts`)
- **Setup Mocks**:
    - Mock `fetch` to provide a valid PDF header (`%PDF-`).
    - Mock `ResizeObserver` (global).
    - Mock `HTMLCanvasElement.prototype.transferControlToOffscreen`.
    - Mock `createImageBitmap`.
- **Initialization & Lifecycle**:
    - Verify `_initializeWorkers` creates 4 workers.
    - Verify `connectedCallback` re-initializes if workers were terminated.
    - Verify `disconnectedCallback` terminates workers and clears cache.
    - Verify `firstUpdated` initializes `ResizeObserver` and `OffscreenCanvas`.
- **File Loading**:
    - Test `_loadFile` with string URL and `File` object.
    - Verify magic byte validation.
    - Verify `_loadFile` waits for library initialization if called too early.
- **Worker Communication**:
    - Mock `postMessage` on workers to capture outgoing messages.
    - Simulate incoming messages (`libraryInitialized`, `pdfLoaded`, `pageRendered`, `pageToBitmap`, `error`) and verify state updates.
- **UI Interactions**:
    - Test page navigation (prev/next/input) and verify they trigger re-renders.
    - Test zoom slider and verify it debounces worker messages.
    - Test "Fit to view" button and verify it calculates correct scale.
- **Error Handling**:
    - Test fetch failure.
    - Test invalid PDF header.
    - Test worker errors.

### 2. Worker Tests (`tests/pdf/pdf.worker.vitest.ts`)
- **Setup Environment**:
    - Mock `PDFiumLibrary`, `PDFiumDocument`, and `PDFiumPage`.
    - Mock `self.postMessage`.
    - Mock `ImageData` and `createImageBitmap`.
- **Message Handlers**:
    - `init`: Verify it calls `PDFiumLibrary.init`.
    - `initCanvas`: Verify it stores the canvas and context.
    - `loadPdf`: Verify it calls `pdfLibrary.loadDocument` and handles different buffer types.
    - `renderPage`: Verify it calls `page.render` and `postMessage` with `pageRendered`.
    - `renderToBitmap`: Verify it calls `page.render`, `createImageBitmap`, and `postMessage` with `pageToBitmap`.
    - `drawBitmap`: Verify it uses `offscreenContext.drawImage` and closes the bitmap.
    - `zoom`: Verify it calculates new scale if `fitMode` is provided and calls `renderPageInternal`.
- **Edge Cases**:
    - Invalid page numbers.
    - Missing library/document.
    - Unhandled promise rejections.

## Verification & Testing
- Run `yarn vitest run --coverage` to verify coverage exceeds 85% for both files.
- Ensure all tests pass.
