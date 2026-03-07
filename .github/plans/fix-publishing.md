# Fix Publishing: Types & Inline Workers

## Problems

### 1. Vite-specific imports in published JS

`tsc` outputs JS files that still contain:

```js
import PdfWorker from "./workers/pdf.worker?worker&inline";
import pdfiumWasmUrl from "@hyzyla/pdfium/pdfium.wasm?url";
import CbzWorker from "./workers/cbz.worker?worker&inline";
```

These are Vite-only syntax — they break for any consumer not using Vite (`?worker&inline`, `?url`).

**Fix:** Switch from `tsc`-only build to a Vite library build that:

- Bundles workers inline as base64 blob URLs
- Resolves `?url` imports
- Emits a clean ESM bundle consumers can use with any bundler
- Use `vite-plugin-dts` to generate `.d.ts` files from the Vite build

### 2. Missing/incomplete type declarations

- `lib/components/pdf/workers/pdf.worker.d.ts` → `export {};` (empty)
- `lib/components/cbz/workers/cbz.worker.d.ts` → `export {};` (empty)
- `lib/utils/epub-utils.d.ts` → `export {};` (empty, wrong re-export)
- No `types` or `exports` field in package.json for TypeScript resolution
- `lib/MyElement.{d.ts,js}` files exist but aren't in the `files` array

**Fix:**

- Add `vite-plugin-dts` to generate rolled-up `.d.ts`
- Add proper `types`, `module`, `main`, `exports` fields to package.json

### 3. `files` array too narrow

Missing: `lib/my-element.*`, `lib/MyElement.*`, `.map` files

**Fix:** Simplify to `"files": ["lib", "README.md"]`

## Implementation (COMPLETED)

### Step 1: Install vite-plugin-dts ✅

```bash
yarn add -D vite-plugin-dts
```

### Step 2: Add Vite library build config ✅

Updated `vite.config.ts` with:

- `build.lib` entry: `src/index.ts`, format: `es`, `preserveModules: true`
- Custom `pdfiumWasmInlinePlugin()` to resolve `@hyzyla/pdfium/pdfium.wasm?url` as base64 data URL via a `\0pdfium-wasm-url` virtual module
- Rollup `external()` function that externalizes `lit`, `epubjs`, `jszip`, `@hyzyla/pdfium` but lets `?worker`, `?inline`, `?url` imports be resolved by Vite
- `copyPublicDir: false` to prevent test files from leaking into lib/
- `vite-plugin-dts` generates `.d.ts` files

### Step 3: Update package.json ✅

- Added `"main"`, `"module"`, `"types"`, `"exports"` fields
- Simplified `"files"` to `["lib", "README.md"]`
- Updated `"build"` script to `"rimraf lib && vite build"`

### Step 4: Verify ✅

- `yarn build` produces lib/ with:
  - Clean ESM JS (no `?worker&inline` or `?url` imports)
  - Workers bundled as self-contained blob URL factories (cbz: 149KB, pdf: 5.5MB)
  - WASM inlined as base64 data URL in `_virtual/_pdfium-wasm-url.js`
  - Complete `.d.ts` type declarations for all components
- `npm pack --dry-run`: 63 files, 11MB unpacked (no test files)
- `yarn test`: 15 files, 138 tests, ALL PASSING
