import { css } from "lit";

export const PopoverMenuStyles = css`
  :host {
    display: inline-block;
    position: relative;
  }

  .popover {
    position: absolute;
    background: var(--popover-background, #ffffff);
    border: 1px solid var(--popover-border-color, #dddddd);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 12px;
    z-index: 1000;
    min-width: 200px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px);
    transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
  }

  .popover.visible {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .popover.top {
    bottom: calc(100% + 8px);
  }

  .popover.bottom {
    top: calc(100% + 8px);
    right: 0;
  }

  .popover.left {
    right: 0;
  }

  .popover.right {
    left: 0;
  }

  @media (prefers-color-scheme: dark) {
    .popover {
      --popover-background: #2d2d2d;
      --popover-border-color: #404040;
    }
  }
`;
