export interface ViewModeChangedEvent
  extends CustomEvent<{
    isDualPage: boolean;
  }> {
  detail: {
    isDualPage: boolean;
  };
}
