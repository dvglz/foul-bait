// Thin wrapper over gtag (GA4). Safe to call even if gtag never loaded
// (e.g. ad blocker, dev mode without network) — calls become no-ops.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type EventParams = Record<string, string | number | boolean | undefined>;

export function track(event: string, params: EventParams = {}): void {
  try {
    if (typeof window === 'undefined') return;
    const g = window.gtag;
    if (typeof g === 'function') {
      g('event', event, params);
    }
  } catch {
    // swallow — analytics must never break the game
  }
}
