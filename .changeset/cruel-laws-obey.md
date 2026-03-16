---
"@quincarter/document-viewer": patch
---

This PR represents a major milestone in improving the robustness and performance of the document viewer components. The core focus is migrating the testing infrastructure from `web-test-runner` to **Vitest**, significantly expanding test coverage across all viewer types (PDF, EPUB, CBZ), and laying the groundwork for improved PDF rendering performance.

- **Migration to Vitest**: Removed `web-test-runner.config.mjs` and migrated all tests to Vitest for faster execution and better developer experience.
- **Browser-Based Testing**: Integrated Vitest Browser Mode for component-level testing, ensuring accurate rendering validation in real-browser environments.
- **Improved Coverage**: Implemented comprehensive testing plans for all document viewers, with a target coverage of >85%.
- **New Test Assets**: Added `public/outerbanksthorou1996nort.pdf` for real-world PDF rendering validation.
- **Worker Logic Testing**: Introduced dedicated Vitest tests for Web Workers (`pdf.worker.vitest.ts`, `epub-utils.vitest.ts`) to ensure off-thread logic is verified independently of the UI.

- **Worker Management**: Refined worker initialization and lifecycle management in `PdfViewer.ts`.
- **Pre-rendering Preparation**: Established a roadmap (`pdf-pre-rendering.md`) for advanced performance optimizations.
- **Scaling & Responsiveness**: Updated `PdfViewer` to better handle dynamic resizing and offscreen canvas management.
- Fixed a bug where the PDF document would re-render after each action. These fixes above optimize the rendering performance by offloading canvas tasks to a worker, zoom occurs on the existing rendered canvas without needing to re-render the document, and I am not pre-caching and spinning up multiple workers to render the next and previous 5 pages into memory for a better page turning experience.

- **Normalization**: Standardized controls and UI logic across `EpubViewer` and `CbzViewer`.
- **State Management**: Refactored `EpubManager` and `CbzViewer` state handling for more predictable behavior during document loading and navigation.
- **Dual-Page Support**: Improved pairing logic for CBZ documents in dual-page mode.

- **Document Routing**: Updated `DocumentRouter` for more robust document type detection and component switching.
- **Popover Menu**: Enhanced the `PopoverMenu` component for better accessibility and consistent behavior across viewers.
- **Styling Consistency**: Normalized control layouts and interaction patterns.

Four new strategic plans have been added to guide ongoing and future work:

1. `pdf-coverage.md`: Roadmap for achieving >85% coverage for PDF logic.
2. `epub-cbz-coverage.md`: Detailed plan for increasing EPUB/CBZ viewer test robustness.
3. `pdf-pre-rendering.md`: Architectural strategy for PDF performance optimizations.
4. `vitest-browser-migration.md`: Technical guide for the browser testing transition.

- [x] Ran `yarn vitest run` to verify all unit and integration tests pass.
- [x] Verified component rendering in Vitest Browser Mode.
- [x] Manual validation of PDF, EPUB, and CBZ document loading and navigation.

- `web-test-runner` is no longer supported. Developers should use `yarn test` (mapping to Vitest).
- Significant reorganization of test files to better align with Vitest conventions.
