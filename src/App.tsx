import { Spike } from './screens/Spike';
import { Playing } from './screens/Playing';

function readUrlParams() {
  const p = new URLSearchParams(window.location.search);
  const spike = p.get('spike') === '1';
  const threshold = clamp(parseFloat(p.get('threshold') ?? '0.7'), 0, 1, 0.7);
  const holdMs = clampInt(parseInt(p.get('hold') ?? '500', 10), 0, 5000, 500);
  return { spike, threshold, holdMs };
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
  const { spike, threshold, holdMs } = readUrlParams();
  return (
    <div className="app">
      {spike ? <Spike /> : <Playing threshold={threshold} holdMs={holdMs} />}
    </div>
  );
}
