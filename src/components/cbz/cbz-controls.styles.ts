import { css } from "lit";

export const CbzControlsStyles = css`
  :host {
    position: fixed;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
    transition: opacity 0.2s ease;
  }

  :host(:not(:hover)) {
    opacity: 0.6;
  }

  button {
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 4px;
  }

  button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  button svg {
    width: 1.2em;
    height: 1.2em;
    fill: currentColor;
  }

  .page-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
  }
`;
