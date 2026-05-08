/// <reference types="vite/client" />
import { lazy, Suspense } from 'react';
import { Spike } from './screens/Spike';
import { Playing } from './screens/Playing';

const ExtractPage = import.meta.env.DEV
  ? lazy(() => import('./dev/ExtractPage').then((m) => ({ default: m.ExtractPage })))
  : null;

function readUrlParams() {
  const p = new URLSearchParams(window.location.search);
  const spike = p.get('spike') === '1';
  const extract = p.get('extract') === '1';
  const threshold = clamp(parseFloat(p.get('threshold') ?? '0.7'), 0, 1, 0.7);
  const holdMs = clampInt(parseInt(p.get('hold') ?? '500', 10), 0, 5000, 500);
  return { spike, extract, threshold, holdMs };
}

function clamp(n: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}
function clampInt(n: number, lo: number, hi: number, fallback: number): number {
  if (!Number.isInteger(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

export function App() {
  const { spike, extract, threshold, holdMs } = readUrlParams();
  return (
    <div className="app">
      {extract && ExtractPage ? (
        <Suspense fallback={<div className="center">Loading extractor…</div>}>
          <ExtractPage />
        </Suspense>
      ) : spike ? (
        <Spike />
      ) : (
        <Playing threshold={threshold} holdMs={holdMs} />
      )}
    </div>
  );
}
