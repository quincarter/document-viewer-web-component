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
    background: rgba(0, 0, 0, 0.3);
    color: white;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
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
    padding: 20px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3), transparent);
    transition: opacity 0.3s ease;
    pointer-events: auto;
  }

  button {
    padding: 8px 16px;
    border: none;
    background: rgba(68, 68, 68, 0.8);
    color: white;
    border-radius: 4px;
    cursor: pointer;
    backdrop-filter: blur(4px);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  button:hover {
    background: rgba(102, 102, 102, 0.9);
    transform: translateY(-1px);
  }

  button:disabled {
    background: rgba(204, 204, 204, 0.5);
    cursor: not-allowed;
  }

  button.active {
    background: rgba(0, 120, 215, 0.8);
  }

  button.active:hover {
    background: rgba(0, 120, 215, 0.9);
  }

  button.text-settings {
    padding: 8px;
    border-radius: 50%;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
  }

  button.text-settings svg {
    width: 20px;
    height: 20px;
  }
`;
