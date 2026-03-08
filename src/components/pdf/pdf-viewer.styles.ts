import { css } from "lit";

export const PdfViewerStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 100%;
    font-family: system-ui, -apple-system, sans-serif;
    background-color: #e8e8e8;
    position: relative;
  }

  .viewer-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    position: relative;
  }

  /* ── Content area ─────────────────────────────────────────────────────── */
  .content-area {
    flex-grow: 1;
    overflow: auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background-color: #e0e0e0;
    padding: 1rem 1rem 5rem; /* bottom padding keeps canvas clear of toolbar */
    position: relative;
  }

  canvas {
    display: block;
    margin: 0 auto;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
    background-color: white;
  }

  /* ── Floating bottom toolbar ──────────────────────────────────────────── */
  .toolbar-wrap {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    gap: 8px;
    align-items: center;
    pointer-events: auto;
  }

  /* ── Status overlays ──────────────────────────────────────────────────── */
  .status-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(200, 200, 200, 0.7);
    z-index: 10;
    padding: 1rem;
    text-align: center;
  }

  .status-overlay .message {
    background-color: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .error-message {
    color: #c0392b;
    font-weight: 600;
  }

  .loader {
    border: 3px solid rgba(0, 0, 0, 0.1);
    border-top: 3px solid #3498db;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 0.5rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
