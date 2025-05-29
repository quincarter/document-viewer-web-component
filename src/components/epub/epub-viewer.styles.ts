import { css } from "lit";

export const EpubViewerStyles = css`
  :host {
    display: block;
    width: 100%;
    height: 100%;
    position: relative;
  }

  .content-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
    box-sizing: border-box;
    position: relative;
    background: var(--reader-bg, #ffffff);
    color: var(--reader-text, #333333);
    transition: background-color 0.3s, color 0.3s;
  }

  .content-container.scrolled {
    overflow-y: auto;
    scroll-behavior: smooth;
  }

  .epub-container {
    width: 100%;
    height: 100%;
    margin: 0 auto;
    position: relative;
    font-size: var(--reader-font-size, 100%);
  }

  .epub-container.continuous {
    height: auto;
    min-height: 100%;
  }

  .loading {
    opacity: 0.5;
    pointer-events: none;
  }

  .error {
    color: red;
    padding: 20px;
  }

  /* Theme styles */
  .content-container.theme-light {
    --reader-bg: #ffffff;
    --reader-text: #333333;
  }

  .content-container.theme-dark {
    --reader-bg: #222222;
    --reader-text: #f5f5f5;
  }

  .content-container.theme-sepia {
    --reader-bg: #f4ecd8;
    --reader-text: #5f4b32;
  }

  /* Improve readability */
  .epub-container :global(p) {
    line-height: 1.6;
  }

  .epub-container :global(img) {
    max-width: 100%;
    height: auto;
  }
`;
