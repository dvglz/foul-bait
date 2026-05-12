/// <reference types="vite/client" />
import { lazy, Suspense, useState } from 'react';
import { Spike } from './screens/Spike';
import { Playing } from './screens/Playing';
import { Intro } from './screens/Intro';
import { Results } from './screens/Results';
import { PLACEHOLDER_CARICATURES } from './game/caricatures';
import type { RunResult } from './game/run';

const ExtractPage = import.meta.env.DEV
  ? lazy(() => import('./dev/ExtractPage').then((m) => ({ default: m.ExtractPage })))
  : null;

type Phase = 'intro' | 'playing' | 'results';

function readUrlParams() {
  const p = new URLSearchParams(window.location.search);
  const spike = p.get('spike') === '1';
  const extract = p.get('extract') === '1';
  const debug = p.get('debug') === '1';
  const threshold = clamp(parseFloat(p.get('threshold') ?? '0.85'), 0, 1, 0.85);
  const holdMs = clampInt(parseInt(p.get('hold') ?? '500', 10), 0, 5000, 500);
  return { spike, extract, debug, threshold, holdMs };
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
  const { spike, extract, debug, threshold, holdMs } = readUrlParams();
  const [phase, setPhase] = useState<Phase>('intro');
  const [result, setResult] = useState<RunResult | null>(null);

  if (extract && ExtractPage) {
    return (
      <div className="app">
        <Suspense fallback={<div className="center">Loading extractor…</div>}>
          <ExtractPage />
        </Suspense>
      </div>
    );
  }
  if (spike) {
    return (
      <div className="app">
        <Spike />
      </div>
    );
  }

  return (
    <div className="app">
      {phase === 'intro' && (
        <Intro faceCount={PLACEHOLDER_CARICATURES.length} onStart={() => setPhase('playing')} />
      )}
      {phase === 'playing' && (
        <Playing
          key="run"
          threshold={threshold}
          holdMs={holdMs}
          debug={debug}
          onComplete={(r) => {
            setResult(r);
            setPhase('results');
          }}
        />
      )}
      {phase === 'results' && result && (
        <Results
          result={result}
          onPlayAgain={() => {
            setResult(null);
            setPhase('playing');
          }}
        />
      )}
    </div>
  );
}
