import { css } from "lit";

export const PdfViewerStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 100%;
    font-family: sans-serif;
    background-color: #f0f0f0;
    position: relative;
  }
  .viewer-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background-color: #fff;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background-color: #333;
    color: white;
    flex-shrink: 0;
  }
  header h3 {
    margin: 0;
    font-size: 1.2rem;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .controls input[type="number"] {
    width: 50px;
    padding: 0.25rem;
    text-align: center;
  }
  .controls button,
  .controls select {
    padding: 0.25rem 0.5rem;
    background-color: #555;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }
  .controls button:disabled {
    background-color: #777;
    cursor: not-allowed;
  }
  .controls button:hover:not(:disabled) {
    background-color: #666;
  }
  .content-area {
    flex-grow: 1;
    overflow: auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background-color: #e0e0e0;
    padding: 1rem;
    position: relative;
  }
  canvas {
    display: block;
    margin: 0 auto;
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
    background-color: white;
  }
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
    border-radius: 5px;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
  }
  .error-message {
    color: red;
    font-weight: bold;
  }
  .loader {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;
