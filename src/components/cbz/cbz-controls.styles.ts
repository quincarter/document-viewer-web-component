import { css } from "lit";

export const CbzControlsStyles = css`
  :host {
    /* Layout tokens – inherited from ViewerControlsSharedStyles on the host */
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    align-items: center;
    gap: var(--viewer-ctrl-gap, 8px);
    padding: 6px 12px;
    background: var(--viewer-ctrl-bg, rgba(0, 0, 0, 0.75));
    border-radius: var(--viewer-ctrl-pill-radius, 40px);
    color: var(--viewer-ctrl-color, #ffffff);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: var(--viewer-ctrl-font-size, 0.85rem);
    backdrop-filter: var(--viewer-ctrl-blur, blur(8px));
    -webkit-backdrop-filter: var(--viewer-ctrl-blur, blur(8px));
    transition: opacity 0.2s ease;
    user-select: none;
  }

  :host(:not(:hover)) {
    opacity: 0.75;
  }

  .page-info {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 4px;
    white-space: nowrap;
  }
`;
