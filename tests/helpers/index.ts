import { render, type TemplateResult } from "lit";

/**
 * Renders a Lit template into the DOM and waits for the element's first update.
 * Use in tests that need a fully rendered custom element.
 */
export async function fixture<T extends HTMLElement>(
  template: TemplateResult,
): Promise<T> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  render(template, container);
  const el = container.firstElementChild as T;
  if (el && "updateComplete" in el) {
    await (el as any).updateComplete;
  }
  return el;
}

/**
 * Removes all fixture containers from the DOM.
 * Call in afterEach() to prevent element leaks between tests.
 */
export function fixtureCleanup(): void {
  document.body.innerHTML = "";
}

/**
 * Returns a promise that resolves the next time `eventName` fires on `el`.
 */
export function oneEvent(
  el: EventTarget,
  eventName: string,
  timeout = 2000,
): Promise<Event> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for event: ${eventName}`)),
      timeout,
    );
    el.addEventListener(
      eventName,
      (e) => {
        clearTimeout(timer);
        resolve(e);
      },
      { once: true },
    );
  });
}
