import { css } from "lit";

export const CbzViewerStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 100%;
    position: relative;
    background: var(--viewer-bg, #1e1e1e);
  }

  .viewer-container {
    width: 100%;
    height: 100%;
    position: relative;
    background: var(--viewer-bg, #333);
    overflow: hidden;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    background: var(--viewer-bg, #1e1e1e);
  }

  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--text-color, #fff);
  }

  .error {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--error-color, #ff4444);
    text-align: center;
    padding: 1rem;
  }
`;
