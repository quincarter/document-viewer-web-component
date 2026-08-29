# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

`@quincarter/document-viewer` — a framework-agnostic web component (built with
[Lit](https://lit.dev)) that renders PDF, EPUB, and CBZ (comic book) files in
the browser, published as an installable npm package. Goal is a single
`<document-viewer src="...">` element that auto-detects file type, plus
standalone `<pdf-viewer>`, `<epub-viewer>`, `<cbz-viewer>` elements consumers
can use directly.

- PDF rendering: `@hyzyla/pdfium` (WASM) in a Web Worker — faster than pdf.js.
- EPUB rendering: `epubjs`, HTML-based so text stays selectable/highlightable.
- CBZ rendering: `jszip` in a Web Worker, extracting page images on the fly.
- No TIFF/Office support currently exists in `src/` despite stray artifacts
  in `lib/` from an old build — don't treat `lib/` as source of truth for
  what's supported; it's gitignored build output.

## Commands

```bash
yarn && yarn start      # dev server (vite)
yarn build               # library build -> lib/ (what npm publishes)
yarn build:demo          # demo site build -> dist/ (for gh-pages)
yarn test                # vitest run (single pass)
yarn test:watch          # vitest watch mode
yarn lint                # biome check .
yarn lint:fix             # biome check --write .
yarn format               # biome format --write .
yarn changeset:add        # add a changeset + bump versions
```

Package manager is **yarn 4** (`.yarnrc.yml` / `packageManager` field) — don't
use npm/pnpm commands.

## Architecture

```
src/
  components/
    DocumentRouter.ts     # raw class: sniffs file signature + extension, routes to a viewer
    document-viewer.ts    # registers DocumentRouter as <document-viewer>, re-exports
    document-router.ts    # dead/empty file — see gotcha below, not the router
    pdf/      PdfViewer.ts, pdf-viewer.ts, pdf-viewer.styles.ts, workers/pdf.worker.ts
    epub/     EpubViewer.ts, epub-viewer.ts, EpubControls.ts, epub-controls.ts,
              EpubTextControls.ts, epub-text-controls.ts, utils/epub-utils.ts
    cbz/      CbzViewer.ts, cbz-viewer.ts, CbzControls.ts, cbz-controls.ts,
              workers/cbz.worker.ts, interfaces.ts
    common/   PopoverMenu.ts, popover-menu.ts, viewer-controls.styles.ts
```

Each format follows the same shape: a `*Viewer` component, a `*Controls`
component for the toolbar, a `*.styles.ts` file, and (for pdf/cbz) a Web
Worker doing the heavy lifting off the main thread.

### The dual-file custom-element pattern (important)

For every component you'll find **two files**:

- `PascalCase.ts` (e.g. `CbzViewer.ts`) — the raw `LitElement` class, **no
  `@customElement` decorator applied at module scope**. Importing this file
  has no side effects.
- `kebab-case.ts` (e.g. `cbz-viewer.ts`) — imports the class, registers it
  with `customElements.define("cbz-viewer", CbzViewer)` guarded by
  `customElements.get(...) ||`, and re-exports the class + related types.

This lets consumers either `import "@quincarter/document-viewer/.../cbz-viewer"`
to get the element pre-registered as `<cbz-viewer>`, or import the
`PascalCase` class directly and `customElements.define("my-name", CbzViewer)`
themselves. **When adding or modifying a viewer, keep both files and this
split** — don't merge the decorator into the class file. Note the one
exception: `DocumentRouter.ts`'s kebab-case counterpart is named
`document-viewer.ts` (registers tag `<document-viewer>`), not
`document-router.ts` — the file naming doesn't always mirror the tag name.
See
[EXTENDING.md](EXTENDING.md) and `.github/plans/separate-custom-element-decorators.md`
for the rationale.

### Adding a new file format

Follow [EXTENDING.md](EXTENDING.md): new viewer component → extend
`SupportedFileType` → add signature/extension detection in
`document-viewer.ts`'s `determineFileType` → add a case in `renderViewer` →
import the new kebab-case file. Write a short plan to
`.github/plans/<plan-name>.md` before implementing non-trivial changes
(existing convention in this repo — see `.github/plans/*.md` for examples),
and keep it updated if the approach changes mid-implementation.

## Testing

- Vitest + `happy-dom`, tests live in `tests/`, mirroring `src/components/`.
- `tests/helpers/index.ts` has `fixture()` (render + wait for
  `updateComplete`), `fixtureCleanup()`, and `oneEvent()` — use these instead
  of hand-rolling DOM setup.
- `vitest.config.ts` stubs any `?worker`, `?inline`, `?url` import with a
  `MockWorker` (no-op `postMessage`/`terminate`/listeners) because
  `happy-dom` has no real Worker API. This means **worker logic itself
  (`pdf.worker.ts`, `cbz.worker.ts`) is not exercised by component tests** —
  test message-handling/pure logic in those files directly if it needs
  coverage, don't expect end-to-end postMessage round-trips to work in specs
  that mount a viewer.
- Run `yarn test` before considering a change done; `yarn lint` too (Biome
  enforces tabs + double quotes + import organization — `lint:fix` will
  autofix most violations).

## Release process

Changesets manages versioning (`access: public`, `baseBranch: main`). Add a
changeset (`yarn changeset:add`) for any user-facing change before it merges
to `main`. Don't hand-edit `CHANGELOG.md` or `package.json`'s `version` —
changesets owns both.

## Known repo quirks

- `src/components/document-router.ts` is a dead, empty (0 byte) file —
  unrelated to routing. The real router is `DocumentRouter.ts`, registered
  via `document-viewer.ts`. Don't resurrect or import `document-router.ts`.
- `GEMINI.md` is a symlink to `.github/copilot-instructions.md` — if you
  update AI-agent guidance, prefer editing the target file (or this one),
  not the symlink.
- `lib/` and `dist/` are build output (gitignored) — never hand-edit files
  there; they're regenerated by `yarn build` / `yarn build:demo`.
