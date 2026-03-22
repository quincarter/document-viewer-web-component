---
"@quincarter/document-viewer": minor
---

- feat: add multi-page TIFF support and refactor viewer infrastructure

  CORE CHANGES

  1. TIFF Support (New Feature)

  - WASM-Powered Decoding: Integrated tiff.js (LibTIFF 4.x) to provide robust support for complex TIFF formats.
  - BigTIFF Support: Enabled rendering of TIFF files exceeding 4GB.
  - CCITT Group 4 Compression: Full support for bitonal document scans using standard professional compression.
  - Off-Main-Thread Processing: Implemented a dedicated tiff.worker.ts to handle heavy decoding and image processing without blocking the UI.
  - Multi-page Navigation: Full integration with the shared pagination system, allowing seamless switching between TIFF directories.

  2. Architectural Refactoring

  - BaseDocumentViewer: Extracted common logic (UI state, toolbar, zoom, fit-to-page, worker pool management) into a shared abstract base class.
  - Unified Zoom/Fit Logic: Enhanced the "Fit to View" feature to fit within both container width and height, ensuring portrait documents are fully visible without distortion.
  - Persistent Context: Fixed issues where zoom and fit mode were lost during page transitions.
  - Type Safety: Replaced all 'any' usages with specific interfaces and typed worker communication protocols (WorkerInput, WorkerResponse).

  3. Integrated Routing

  - Signature Detection: Updated DocumentRouter.ts to detect TIFF and BigTIFF files via byte signatures (Little-Endian and Big-Endian), ensuring reliable routing even without file extensions.

  4. Code Quality & Testing

  - New Test Suite: Added tests/tiff/tiff-viewer.test.ts covering lifecycle, caching, rendering, and worker communication.
  - Expanded Coverage: Improved existing PDF and Routing tests to account for the new base class logic.
  - Biome Verification: All files linted, formatted, and verified using the latest Biome standards.

  TECHNICAL DETAILS

  - Worker Mode: Utilizes Module Workers with ESM imports for better bundling performance.
  - Scaling Basis: Set default zoom to 100% natural image scale for a consistent initial experience.
  - Resource Management: Implemented proactive bitmap closing and worker termination to prevent memory leaks during large document navigation.
