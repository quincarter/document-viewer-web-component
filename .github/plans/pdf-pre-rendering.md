# 🔥 PDF Pre-rendering Plan

## Goal
Improve PDF paging experience by eagerly pre-rendering the next 5 pages using a pool of workers and caching them in memory as `ImageBitmap` objects.

## Proposed Changes

### 1. `src/components/pdf/workers/pdf.worker.ts`
- Update the worker to handle new message types:
    - `renderToBitmap`: Renders a specific page and scale to an `ImageBitmap`, then returns it (transferred).
    - `drawBitmap`: Takes an `ImageBitmap` (transferred) and draws it to the `offscreenCanvas` that the worker already owns.
    - `init` should be updated to return a success message so the `PdfViewer` knows when it's ready. (Done)
- Ensure that the worker is robust to missing resources (e.g., if a page is already being rendered).

### 2. `src/components/pdf/PdfViewer.ts`
- Introduce a `_workerPool` of `DocumentWorker` instances (e.g., 3-4 workers).
- Designate one worker as the `_mainWorker` (the one that owns the canvas).
- Implement `_pageCache`: `Map<number, ImageBitmap>`.
- Implement `_prefetchPages(currentPage, scale)`:
    - Calculates the next 5 pages (and potentially the previous 2 for better back-paging).
    - Uses the `_workerPool` (excluding the `_mainWorker`) to render these pages to bitmaps if they aren't already in the cache.
- Update `_renderCurrentPage()`:
    - Check `_pageCache` for the requested page at the current scale.
    - If found: Send `drawBitmap` to `_mainWorker`.
    - If NOT found: Send `renderPage` to `_mainWorker` (this will render and draw directly as it does now).
- Update `_handleWorkerMessage`:
    - Handle `pageToBitmap` response by adding the bitmap to the `_pageCache`.
    - Ensure cache is cleared on zoom, source change, or fit-to-view change.
- Limit cache size (e.g., keep 10-15 most recent pages).

### 3. Worker Pool Management
- Distribute `prefetch` tasks across the pool.
- Each worker needs to have the PDF buffer loaded to render pages. This means we'll need to send the PDF buffer to each worker in the pool.

## Implementation Steps
1.  **Modify `pdf.worker.ts`**:
    *   Add `renderToBitmap` and `drawBitmap` message handlers.
2.  **Modify `PdfViewer.ts`**:
    *   Initialize a pool of workers.
    *   Load the PDF buffer into all workers in the pool.
    *   Implement `_prefetchPages` logic.
    *   Update `_renderCurrentPage` to use the cache.
    *   Handle `pageToBitmap` in `_handleWorkerMessage`.
3.  **Refinement**:
    *   Ensure that pre-fetching doesn't block the main worker from rendering the current page.
    *   Implement cache eviction logic.

## Verification
- Test that paging forward is significantly faster.
- Test that zooming/resizing clears the cache and works correctly.
- Test with different PDF files.

## Status: COMPLETED 🔥
Implemented eager pre-rendering with a 4-worker pool and ImageBitmap cache. Paging experience is now near-instant for cached pages.
