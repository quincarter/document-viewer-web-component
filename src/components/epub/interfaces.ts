import type { EpubFlowType } from "./utils/epub-utils";

export interface PageChangedEvent extends CustomEvent {
  detail: {
    currentPage: number;
    totalPages: number;
  };
}

export interface FlowTypeChangedEvent extends CustomEvent {
  detail: {
    flowType: EpubFlowType;
  };
}

export interface ViewModeChangedEvent
  extends CustomEvent<{
    isDualPage: boolean;
  }> {
  detail: {
    isDualPage: boolean;
  };
}
