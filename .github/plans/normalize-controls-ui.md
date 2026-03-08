# Plan: Normalize Controls UI Across Viewer Experiences

## Goal

Unify the look and feel of controls across PDF, EPUB, and CBZ viewers so they present as a cohesive product. Add zoom range slider + "Fit to View" to the PDF viewer (as default behavior).

## Current State

| Viewer | Controls Location                                       | Style                                                              |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------------ |
| PDF    | Fixed `<header>` bar at top with dark `#333` bg         | Old-school select dropdown for zoom, HTML entity arrow buttons     |
| EPUB   | Floating overlay at top-right, auto-hides on inactivity | Frosted-glass `rgba(68,68,68,0.8)` buttons, nice transitions       |
| CBZ    | Fixed pill at bottom-center of screen                   | Minimal `rgba(0,0,0,0.8)` dark bar, opacity fades when not hovered |

## Unified Design System

All three viewers will share:

- **Color palette**: `rgba(0, 0, 0, 0.75)` background, white text/icons
- **Button shape**: `border-radius: 6px`, `padding: 6px 12px`
- **Hover**: `rgba(255,255,255,0.15)` overlay on hover
- **Active/selected**: `rgba(0, 120, 215, 0.85)` — blue highlight
- **Disabled**: `opacity: 0.4`, `cursor: not-allowed`
- **Gap**: `gap: 8px` between controls
- **Backdrop**: `backdrop-filter: blur(8px)`
- **Toolbar location**: floating bottom-center pill (matching CBZ) for PDF; EPUB keeps its overlay pattern but uses same button tokens
- **Icon+label**: SVG icon at 18x18 + short text label on wider screens, icon-only on narrow

## Shared CSS Custom Properties (design tokens)

Defined on `:host` in each component so they can be overridden by consumers:

```css
--viewer-ctrl-bg: rgba(0, 0, 0, 0.75);
--viewer-ctrl-hover-bg: rgba(255, 255, 255, 0.15);
--viewer-ctrl-active-bg: rgba(0, 120, 215, 0.85);
--viewer-ctrl-color: #ffffff;
--viewer-ctrl-radius: 6px;
--viewer-ctrl-padding: 6px 12px;
--viewer-ctrl-gap: 8px;
--viewer-ctrl-blur: blur(8px);
```

A shared `viewer-controls.styles.ts` file will export these tokens + reusable button/bar CSS so each viewer can `[...sharedStyles, componentStyles]`.

## PDF Viewer Specific Changes

1. **Toolbar position**: Move from `<header>` to a floating pill at the bottom (like CBZ)
2. **Zoom**: Replace `<select>` dropdown with `<input type="range" min="0.5" max="3" step="0.1">` showing current zoom %
3. **Fit to View button**: New button that calculates `scale = containerWidth / pageNativeWidth` and sets it as the current scale. This becomes the **default** when a document loads (replaces hardcoded `1.5`).
4. **Navigation**: Replace HTML entity arrows (`&larr;`) with matching SVG icons
5. **Page input**: Style to match shared design (small number input with increment/decrement)

## CBZ Controls Changes

- Adopt shared CSS tokens — mostly already has the right pill style, just needs alignment on colors/radii
- Add page number display with matching style

## EPUB Controls Changes

- Adopt shared CSS tokens for buttons — already uses frosted-glass correctly
- Align border-radius, padding, and active color

## Implementation Steps

1. [x] Create plan document
2. [ ] Create `src/components/common/viewer-controls.styles.ts` with shared tokens
3. [ ] Refactor `PdfViewer.ts`:
   - Add `_fitToView()` method that computes scale from container dimensions
   - Add `_isFitToView` state flag
   - Add `ResizeObserver` to re-apply fit-to-view on container resize
   - Replace select dropdown with range slider + fit button
   - Move toolbar to floating bottom pill
4. [ ] Refactor `pdf-viewer.styles.ts` to use shared tokens + new toolbar layout
5. [ ] Refactor `cbz-controls.styles.ts` to use shared tokens
6. [ ] Refactor `epub-controls.styles.ts` to use shared tokens
7. [ ] Verify `yarn build` and tests pass

## Files Modified

- `src/components/common/viewer-controls.styles.ts` — NEW
- `src/components/pdf/PdfViewer.ts`
- `src/components/pdf/pdf-viewer.styles.ts`
- `src/components/cbz/cbz-controls.styles.ts`
- `src/components/epub/epub-controls.styles.ts`
