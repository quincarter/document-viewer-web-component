# Epub and CBZ Viewer Testing Plan

## Objective
Increase test coverage for `EpubViewer.ts` and `CbzViewer.ts` to above 85% by implementing comprehensive unit and integration tests.

## Key Files & Context
- `src/components/epub/EpubViewer.ts`: Main Lit component for EPUB viewing.
- `src/components/cbz/CbzViewer.ts`: Main Lit component for CBZ viewing.
- `src/components/epub/utils/epub-utils.ts`: EpubManager used by EpubViewer.
- `src/components/cbz/workers/cbz.worker?worker&inline`: Worker used by CbzViewer.
- `tests/epub/epub-viewer.test.ts`: Existing minimal tests.
- `tests/cbz/cbz-viewer.test.ts`: Existing minimal tests.

## Implementation Steps

### 1. CBZ Viewer Tests (`tests/cbz/cbz-viewer.test.ts`)
- **Mocking**:
    - Mock `CbzWorker` (similar to PdfWorker mock).
    - Mock `ResizeObserver` (global).
    - Mock `fetch` and `Response`.
    - Mock `URL.createObjectURL` and `URL.revokeObjectURL`.
    - Mock `Image` and its `onload`/`onerror` handlers.
    - Mock `CanvasRenderingContext2D` and `HTMLCanvasElement`.
- **Test Cases**:
    - **Worker Initialization**: Verify `init` message sent on startup.
    - **Loading Document**: Test `src` change, `fetch` failure, and worker `loadCbz` message.
    - **Worker Messaging**:
        - `cbzWorkerInitialized` triggers loading if `src` is present.
        - `cbzLoaded` updates state and renders page.
        - `cbzPageRendered` handles image creation and drawing.
        - `error` updates `_error` and `_loading`.
    - **Navigation Logic (Single Page)**: `_handleNextPage` / `_handlePrevPage` increments/decrements.
    - **Navigation Logic (Dual Page)**:
        - Handle cover (page 1) transition to pair (page 2, 3).
        - Maintain even-odd pairing (2nd page of pair leads to next pair).
        - Correctly load next page in pair via `_loadNextPageIfNeeded`.
    - **Canvas Interaction**: Test `_handleCanvasClick` on left, middle, and right thirds.
    - **View Mode Change**: Test switching between single and dual page modes.
    - **Responsive Scaling**: Verify `ResizeObserver` callback updates canvas size.

### 2. EPUB Viewer Tests (`tests/epub/epub-viewer.test.ts`)
- **Mocking**:
    - Mock `EpubManager` (already partially mocked in other tests, but need thorough mocks for its methods).
    - Mock `loadSettings` and `saveSettings` from `epub-utils.ts`.
    - Mock `ResizeObserver` (global).
    - Mock `fetch` and `Response`.
- **Test Cases**:
    - **Initialization**: Verify settings are applied from `loadSettings`.
    - **Loading Document**:
        - Test `src` change triggers `loadEpubDocument`.
        - Verify `epubManager.loadBook` and `createRendition` are called.
        - Verify `epub-loaded` event dispatch.
        - Test `fetch` failure and error state.
    - **Navigation**:
        - `_nextPage` / `_prevPage` logic and bounds checking.
        - `page-changed` event dispatch.
    - **Preferences**:
        - Font size changes update manager and save settings.
        - Theme changes update manager and save settings.
        - Flow type changes update manager, save settings, and handle listeners.
    - **Keyboard Navigation**: Arrow keys trigger page changes.
    - **Relocation**: `_onEpubRelocated` updates `currentPage` in scrolled mode.
    - **Lifecycle**: Verify cleanup in `disconnectedCallback`.

## Verification & Testing
- Run `yarn vitest run --coverage` to verify coverage exceeds 85% for:
    - `src/components/epub/EpubViewer.ts`
    - `src/components/cbz/CbzViewer.ts`
- Ensure all tests pass across the codebase.
