import { css } from "lit";

export const EpubConrolsStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .controls-container {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .content-area {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .content-area.controls-pinned {
    padding-top: 60px;
  }

  /* Navigation areas */
  .nav-area {
    position: absolute;
    top: 60px;
    bottom: 0;
    width: 7%;
    opacity: 0;
    transition: opacity 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    z-index: 101;
  }

  .nav-area:hover {
    opacity: 1;
  }

  .nav-area.left {
    left: 0;
    cursor: w-resize;
  }

  .nav-area.right {
    right: 0;
    cursor: e-resize;
  }

  .nav-arrow {
    background: var(--viewer-ctrl-bg, rgba(0, 0, 0, 0.75));
    color: var(--viewer-ctrl-color, white);
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: var(--viewer-ctrl-blur, blur(8px));
    -webkit-backdrop-filter: var(--viewer-ctrl-blur, blur(8px));
    transition: transform 0.2s ease, background-color 0.2s ease;
  }

  .nav-area:hover .nav-arrow {
    transform: scale(1.1);
    background: rgba(0, 0, 0, 0.5);
  }

  .nav-area.left .nav-arrow::before {
    content: "‹";
    font-size: 24px;
  }

  .nav-area.right .nav-arrow::before {
    content: "›";
    font-size: 24px;
  }

  .nav-area.disabled {
    pointer-events: none;
    opacity: 0;
  }

  /* Control overlays */
  .controls-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .controls-overlay.visible,
  .controls-overlay.pinned {
    opacity: 1;
  }

  .viewer-controls {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    padding: 16px 20px;
    display: flex;
    justify-content: flex-end;
    gap: var(--viewer-ctrl-gap, 8px);
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.35), transparent);
    transition: opacity 0.3s ease;
    pointer-events: auto;
  }

  /* Use shared .ctrl-btn, .ctrl-bar tokens — override only what differs */
  button {
    padding: var(--viewer-ctrl-padding, 6px 12px);
    border: none;
    background: var(--viewer-ctrl-bg, rgba(0, 0, 0, 0.75));
    color: var(--viewer-ctrl-color, white);
    border-radius: var(--viewer-ctrl-radius, 6px);
    cursor: pointer;
    backdrop-filter: var(--viewer-ctrl-blur, blur(8px));
    -webkit-backdrop-filter: var(--viewer-ctrl-blur, blur(8px));
    transition: background 0.15s ease, transform 0.1s ease;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font: inherit;
    font-size: var(--viewer-ctrl-font-size, 0.85rem);
    line-height: 1;
  }

  button:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.85);
    filter: brightness(1.2);
  }

  button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  button.active {
    background: var(--viewer-ctrl-active-bg, rgba(0, 120, 215, 0.85));
  }

  button.active:hover:not(:disabled) {
    background: var(--viewer-ctrl-active-bg, rgba(0, 120, 215, 0.85));
    filter: brightness(1.15);
  }

  /* Icon-only round button (text settings) */
  button.text-settings {
    padding: var(--viewer-ctrl-icon-padding, 6px);
    border-radius: 50%;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
  }

  button.text-settings svg {
    width: 18px;
    height: 18px;
  }
`;
