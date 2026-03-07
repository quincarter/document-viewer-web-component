# Separate @customElement Decorators from Class Definitions

## Goal

Separate the `@customElement()` decorator from component class definitions. Each component gets:

- **PascalCase.ts** - Pure class file (no `@customElement` decorator)
- **kebab-case.ts** - Declaration/registration file (imports class, calls `customElements.define()`, re-exports)

## Already Done (existing pattern to follow)

- `CbzViewer.ts` + `cbz-viewer.ts` ✓
- `EpubViewer.ts` + `epub-viewer.ts` ✓
- `PdfViewer.ts` + `pdf-viewer.ts` ✓

## Components to Refactor

### 1. `src/my-element.ts` → `src/MyElement.ts` + `src/my-element.ts`

- [x] Create `MyElement.ts` with class (no decorator), keep side-effect import of `./components/document-viewer`
- [x] Update `my-element.ts` to registration file pattern

### 2. `src/components/document-viewer.ts` → `src/components/DocumentRouter.ts` + `src/components/document-viewer.ts`

- [x] Create `DocumentRouter.ts` with class, keep viewer side-effect imports
- [x] Update `document-viewer.ts` to registration file pattern

### 3. `src/components/cbz/cbz-controls.ts` → `src/components/cbz/CbzControls.ts` + `src/components/cbz/cbz-controls.ts`

- [x] Create `CbzControls.ts` with class
- [x] Update `cbz-controls.ts` to registration file pattern

### 4. `src/components/common/popover-menu.ts` → `src/components/common/PopoverMenu.ts` + `src/components/common/popover-menu.ts`

- [x] Create `PopoverMenu.ts` with class
- [x] Update `popover-menu.ts` to registration file pattern

### 5. `src/components/epub/epub-controls.ts` → `src/components/epub/EpubControls.ts` + `src/components/epub/epub-controls.ts`

- [x] Create `EpubControls.ts` with class, keep side-effect imports for popover-menu and epub-text-controls
- [x] Update `epub-controls.ts` to registration file pattern

### 6. `src/components/epub/epub-text-controls.ts` → `src/components/epub/EpubTextControls.ts` + `src/components/epub/epub-text-controls.ts`

- [x] Create `EpubTextControls.ts` with class
- [x] Update `epub-text-controls.ts` to registration file pattern

## Import Impact

- All existing test imports reference the kebab-case declaration files → still work after refactor
- `src/index.ts` imports from kebab-case files → still works
- Side-effect imports for custom elements stay in the CLASS files (since the render() methods use them)
- No circular dependencies introduced

## Verification

- [x] `yarn build` passes
- [x] Tests still pass
