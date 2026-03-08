import { css } from "lit";

/**
 * Shared design tokens and base styles for all viewer control toolbars.
 * Consumed by pdf-viewer, epub-controls, and cbz-controls via static styles array.
 *
 * Consumers can override any token via CSS custom properties on the host element.
 */
export const ViewerControlsSharedStyles = css`
  /* ── Design tokens ─────────────────────────────────────────────────────── */
  :host {
    --viewer-ctrl-bg: rgba(0, 0, 0, 0.75);
    --viewer-ctrl-hover-bg: rgba(255, 255, 255, 0.15);
    --viewer-ctrl-active-bg: rgba(0, 120, 215, 0.85);
    --viewer-ctrl-danger-bg: rgba(200, 40, 40, 0.85);
    --viewer-ctrl-color: #ffffff;
    --viewer-ctrl-muted: rgba(255, 255, 255, 0.55);
    --viewer-ctrl-radius: 6px;
    --viewer-ctrl-pill-radius: 40px;
    --viewer-ctrl-padding: 6px 12px;
    --viewer-ctrl-icon-padding: 6px;
    --viewer-ctrl-gap: 8px;
    --viewer-ctrl-blur: blur(8px);
    --viewer-ctrl-font-size: 0.85rem;
    --viewer-ctrl-divider: rgba(255, 255, 255, 0.2);
  }

  /* ── Toolbar pill container ─────────────────────────────────────────────── */
  .ctrl-bar {
    display: flex;
    align-items: center;
    gap: var(--viewer-ctrl-gap);
    padding: 6px 12px;
    background: var(--viewer-ctrl-bg);
    backdrop-filter: var(--viewer-ctrl-blur);
    -webkit-backdrop-filter: var(--viewer-ctrl-blur);
    border-radius: var(--viewer-ctrl-pill-radius);
    color: var(--viewer-ctrl-color);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: var(--viewer-ctrl-font-size);
    user-select: none;
  }

  /* ── Vertical divider ───────────────────────────────────────────────────── */
  .ctrl-divider {
    width: 1px;
    height: 20px;
    background: var(--viewer-ctrl-divider);
    flex-shrink: 0;
  }

  /* ── Base button ────────────────────────────────────────────────────────── */
  .ctrl-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    padding: var(--viewer-ctrl-padding);
    background: transparent;
    color: var(--viewer-ctrl-color);
    border: none;
    border-radius: var(--viewer-ctrl-radius);
    font: inherit;
    font-size: var(--viewer-ctrl-font-size);
    cursor: pointer;
    transition: background 0.15s ease, transform 0.1s ease, opacity 0.15s ease;
    white-space: nowrap;
    line-height: 1;
  }

  .ctrl-btn svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    fill: currentColor;
  }

  .ctrl-btn:hover:not(:disabled) {
    background: var(--viewer-ctrl-hover-bg);
  }

  .ctrl-btn:active:not(:disabled) {
    transform: scale(0.95);
  }

  .ctrl-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  /* Icon-only button (square) */
  .ctrl-btn.icon-only {
    padding: var(--viewer-ctrl-icon-padding);
    border-radius: var(--viewer-ctrl-radius);
    aspect-ratio: 1;
  }

  /* Active / toggled state */
  .ctrl-btn.active {
    background: var(--viewer-ctrl-active-bg);
  }

  .ctrl-btn.active:hover:not(:disabled) {
    background: var(--viewer-ctrl-active-bg);
    filter: brightness(1.15);
  }

  /* ── Page info label ────────────────────────────────────────────────────── */
  .ctrl-page-info {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--viewer-ctrl-color);
    font-size: var(--viewer-ctrl-font-size);
    white-space: nowrap;
  }

  .ctrl-page-input {
    width: 36px;
    padding: 2px 4px;
    text-align: center;
    background: rgba(255, 255, 255, 0.15);
    color: var(--viewer-ctrl-color);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 4px;
    font: inherit;
    font-size: var(--viewer-ctrl-font-size);
  }

  .ctrl-page-input:focus {
    outline: none;
    border-color: var(--viewer-ctrl-active-bg);
  }

  /* Remove number input spinner arrows */
  .ctrl-page-input::-webkit-outer-spin-button,
  .ctrl-page-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .ctrl-page-input[type="number"] {
    -moz-appearance: textfield;
  }

  /* ── Zoom range slider ──────────────────────────────────────────────────── */
  .ctrl-zoom-wrap {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .ctrl-zoom-label {
    min-width: 38px;
    text-align: right;
    color: var(--viewer-ctrl-color);
    font-size: var(--viewer-ctrl-font-size);
    font-variant-numeric: tabular-nums;
  }

  .ctrl-range {
    -webkit-appearance: none;
    appearance: none;
    width: 100px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.25);
    outline: none;
    cursor: pointer;
    accent-color: var(--viewer-ctrl-active-bg);
  }

  .ctrl-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--viewer-ctrl-color);
    cursor: pointer;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
    transition: transform 0.1s ease;
  }

  .ctrl-range::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .ctrl-range::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--viewer-ctrl-color);
    cursor: pointer;
    border: none;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
  }
`;
