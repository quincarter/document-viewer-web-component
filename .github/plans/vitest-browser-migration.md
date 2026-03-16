# Vitest Browser Mode Migration Plan

## Problem
Currently, our tests use `happy-dom`, which is a simulated DOM environment. While fast, it has several limitations for this project:
- **No real Web Workers:** We have to stub `?worker&inline` imports, so we aren't testing the actual background processing logic.
- **No real WASM support:** PDFium's rendering depends on WASM and `OffscreenCanvas`, which `happy-dom` doesn't fully support.
- **CSS & Layout:** Simulated DOMs don't accurately reflect CSS visibility, Z-index, or layout-dependent behavior (like EPUB pagination).

## Strategy
Migrate component tests to **Vitest Browser Mode** using **Playwright** as the provider. This will run tests in a real Chromium instance, allowing us to test our library in its native environment.

## Steps

### 1. Install Dependencies
- [ ] Install `@vitest/browser` and `playwright`.
- [ ] (Already done) Ensure system dependencies are present via `npx playwright install-deps`.

### 2. Update `vitest.config.ts`
- [ ] Configure the `test.browser` field:
  - `enabled: true`
  - `name: 'chromium'`
  - `provider: 'playwright'`
- [ ] Maintain a "Hybrid Mode":
  - Keep `happy-dom` for pure logic tests (`*.vitest.ts`).
  - Use `browser` for component tests (`*.test.ts`).

### 3. Refine Test Helpers (`tests/helpers/index.ts`)
- [ ] Update `fixture<T>()` to work within the Vitest Browser context.
- [ ] Explore `@vitest/browser`'s built-in `render` or `page` utilities if they simplify our current helpers.

### 4. Worker & WASM Strategy
- [ ] **Phase 1 (Compatibility):** Keep existing stubs to ensure initial migration passes.
- [ ] **Phase 2 (Integration):** Transition `pdf-viewer.test.ts` and `cbz-viewer.test.ts` to use real worker files.
  - This requires ensuring Vite correctly bundles workers during the test run.
  - This allows us to verify `postMessage` contracts and actual file parsing.

### 5. Incremental Migration
- [ ] **Low Complexity:** `styles.test.ts`, `interfaces.test.ts`, `popover-menu.test.ts`.
- [ ] **Medium Complexity:** `cbz-controls.test.ts`, `epub-text-controls.test.ts`.
- [ ] **High Complexity:** `pdf-viewer.test.ts`, `epub-viewer.test.ts` (Real navigation and rendering).

### 6. Validation
- [ ] `yarn test` runs and passes in a headless browser.
- [ ] Visual verification using `--ui` mode to see components rendering during tests.
- [ ] Verify that `localStorage` (for EPUB settings) behaves correctly in a real browser session.

## Result
A more robust testing suite that guarantees the document-viewer works correctly across real browser primitives (Workers, WASM, Canvas, and complex CSS).
