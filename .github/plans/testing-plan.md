# Component Testing Plan

## Overview

Full test coverage for all components in the document-viewer web component library using **Web Test Runner** with **@open-wc/testing** for Lit component tests, and **Vitest** for worker/utility unit tests.

## Test Framework Setup

- **@web/test-runner** + **@open-wc/testing** for Lit component tests (DOM, shadow DOM, events, properties)
- **Vitest** for pure logic unit tests (utilities, settings, interfaces)
- Tests directory: `./tests/` at root level

## Components to Test

### 1. `my-element` (src/my-element.ts)

- [x] Renders with default empty src
- [x] Passes src to document-viewer child
- [x] Has correct host styles (block, 100% w/h)
- [x] Registered as `my-element` custom element

### 2. `document-viewer` / DocumentRouter (src/components/document-viewer.ts)

- [x] Renders "No file provided" when no src
- [x] Sets error for unsupported file format
- [x] Detects PDF via magic bytes (%PDF-)
- [x] Detects EPUB via PK zip + .epub extension
- [x] Detects CBZ via PK zip + .cbz extension
- [x] Renders appropriate viewer for each type
- [x] Handles fetch errors gracefully

### 3. `cbz-controls` (src/components/cbz/cbz-controls.ts)

- [x] Renders page info (currentPage / totalPages)
- [x] Renders dual page toggle button
- [x] Dispatches `view-mode-changed` event on toggle
- [x] Updates isDualPage state on toggle
- [x] Shows correct button text based on isDualPage state

### 4. CbzViewer (src/components/cbz/CbzViewer.ts)

- [x] Initializes with default state
- [x] Has correct properties (src, loading, error, isDualPage etc.)
- [x] Renders canvas element
- [x] Shows loading state
- [x] Shows error state
- [x] Shows controls when not loading/erroring
- [x] Handles view mode changes
- [x] Next/prev page navigation logic (single mode)
- [x] Next/prev page navigation logic (dual mode)

### 5. `popover-menu` (src/components/common/popover-menu.ts)

- [x] Renders trigger slot and popover content
- [x] Starts closed (open = false)
- [x] Toggles open on trigger click
- [x] Dispatches `popover-toggle` event
- [x] closePopover() method works
- [x] Applies position/alignment classes
- [x] Reflects open attribute

### 6. `epub-text-controls` (src/components/epub/epub-text-controls.ts)

- [x] Renders font size slider
- [x] Renders theme buttons (light, dark, sepia)
- [x] Renders layout buttons (paginated, scrollable)
- [x] Dispatches `font-size-changed` event
- [x] Dispatches `theme-changed` event
- [x] Dispatches `flow-type-changed` event
- [x] Shows view mode buttons only when supportsDualPage is true
- [x] Dispatches `view-mode-changed` event

### 7. `epub-controls` (src/components/epub/epub-controls.ts)

- [x] Renders controls overlay
- [x] Auto-hides controls after delay
- [x] Pin button toggles pinned state
- [x] Dispatches prev-page / next-page events
- [x] Shows nav areas in paginated mode
- [x] Disables nav when at first/last page
- [x] Dispatches font-size-changed, theme-changed, flow-type-changed events

### 8. EpubViewer (src/components/epub/EpubViewer.ts)

- [x] Initializes with default state
- [x] Loads settings from localStorage on construction
- [x] Has correct properties
- [x] Dispatches epub-loaded event
- [x] Dispatches epub-error event on failure
- [x] Page navigation methods
- [x] Theme/font size change handlers
- [x] Getter methods (currentPageNumber, totalPageCount, tableOfContents)
- [x] Saves settings on change

### 9. PdfViewer (src/components/pdf/PdfViewer.ts)

- [x] Initializes with default state
- [x] Renders viewer container with header and controls
- [x] Renders canvas element
- [x] Shows loading overlay
- [x] Shows error overlay
- [x] Page navigation (prev/next/input)
- [x] Zoom change handling
- [x] Validates PDF magic bytes
- [x] Handles worker messages

### 10. Utility Functions (src/components/epub/utils/epub-utils.ts)

- [x] loadSettings() returns defaults when no stored settings
- [x] loadSettings() merges stored settings with defaults
- [x] saveSettings() stores to localStorage
- [x] EpubManager construction
- [x] EpubManager.destroy() cleanup
- [x] EpubManager.isLoaded() state check
- [x] EpubManager.updateFontSize() converts % to em

### 11. Style Modules

- [x] DocumentViewerStyles exports css
- [x] CbzControlsStyles exports css
- [x] CbzViewerStyles exports css
- [x] PopoverMenuStyles exports css
- [x] EpubConrolsStyles exports css
- [x] EpubViewerStyles exports css
- [x] PdfViewerStyles exports css

### 12. Interfaces/Types

- [x] CBZ ViewModeChangedEvent interface shape
- [x] EPUB PageChangedEvent interface shape
- [x] EPUB FlowTypeChangedEvent interface shape
- [x] EPUB ViewModeChangedEvent interface shape

### 13. Registration Wrappers

- [x] cbz-viewer.ts registers custom element
- [x] epub-viewer.ts registers custom element
- [x] pdf-viewer.ts registers custom element

### 14. Index Exports (src/index.ts)

- [x] All expected exports are available

## Test File Structure

```
tests/
├── my-element.test.ts
├── document-viewer.test.ts
├── cbz/
│   ├── cbz-controls.test.ts
│   └── cbz-viewer.test.ts
├── common/
│   └── popover-menu.test.ts
├── epub/
│   ├── epub-controls.test.ts
│   ├── epub-text-controls.test.ts
│   ├── epub-viewer.test.ts
│   └── epub-utils.test.ts
├── pdf/
│   └── pdf-viewer.test.ts
├── styles.test.ts
├── interfaces.test.ts
└── index-exports.test.ts
```
