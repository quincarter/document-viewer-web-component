# Vitest Migration Plan

## Problem

- WTR (Web Test Runner) + esbuild fails with `SyntaxError: Invalid or unexpected token` for ANY test that uses Lit decorators — a pre-existing issue
- Only 3 pure non-decorator tests pass in WTR: `styles.test.ts` (7), `interfaces.test.ts` (4), `minimal.test.ts` (3) = 14 total
- All 11 component tests fail
- `?worker&inline` imports need Vite's transform pipeline (not esbuild) to work

## Strategy

Move ALL tests to Vitest since:

1. Vitest uses Vite's transform pipeline — handles Lit decorators natively
2. Vitest handles `?worker&inline`, `?url`, WASM imports through Vite plugins
3. `happy-dom` provides DOM APIs needed for Lit component fixture testing
4. Vitest's `expect` is Chai-based, so existing Chai matchers work unchanged

## Steps

### 1. Install dependencies

- [x] `happy-dom` for DOM environment in Vitest

### 2. Update `vitest.config.ts`

- [x] Merge with `vite.config.ts` to inherit wasm/topLevelAwait plugins
- [x] Include `tests/**/*.{test,vitest}.ts`
- [x] Set `environment: 'happy-dom'`
- [x] Add custom Vite plugin to stub `?worker&inline` and `?url` imports in test env

### 3. Create test helpers (`tests/helpers/index.ts`)

- [x] `fixture<T>()` — renders a Lit template, waits for `updateComplete`
- [x] `fixtureCleanup()` — cleans DOM between tests
- [x] `oneEvent()` — promise that resolves on a single event dispatch

### 4. Convert test files

Replace `@open-wc/testing` imports with Vitest + Lit + helpers. Chai matchers work as-is.

#### No mocks needed (no transitive worker deps):

- [x] `styles.test.ts`
- [x] `interfaces.test.ts`
- [x] `minimal.test.ts`
- [x] `decorator.test.ts`
- [x] `cbz/cbz-controls.test.ts`
- [x] `common/popover-menu.test.ts`
- [x] `epub/epub-controls.test.ts`
- [x] `epub/epub-text-controls.test.ts`

#### Worker/WASM mocks needed (transitive `?worker&inline` deps):

- [x] `cbz/cbz-viewer.test.ts` — imports CbzViewer (cbz.worker)
- [x] `pdf/pdf-viewer.test.ts` — imports PdfViewer (pdf.worker + WASM)
- [x] `epub/epub-viewer.test.ts` — imports EpubViewer (epubjs)
- [x] `document-viewer.test.ts` — imports DocumentRouter → all viewers
- [x] `my-element.test.ts` — imports MyElement → document-viewer → all viewers
- [x] `index-exports.test.ts` — imports index → all viewers

#### Already Vitest format:

- [x] `epub/epub-utils.vitest.ts` — no changes needed

### 5. Update package.json scripts

- [x] `test` → `vitest run`
- [x] `test:watch` → `vitest`
- [x] `test:wtr` → `web-test-runner` (keep as fallback)
- [x] Remove `test:vitest`, `test:vitest:watch`, `test:all` (consolidated)

### 6. Verify

- [x] `yarn test` runs all tests through Vitest
- [x] All 15 test files pass (138 tests)
- [x] `npx tsc --noEmit` still clean

## Result

**15 test files, 138 tests — all passing** in ~5.7s via Vitest + happy-dom.

Previous state: WTR could only run 14 tests across 3 files. Now all 138 tests pass.
