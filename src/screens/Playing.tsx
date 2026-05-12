import { useCallback, useEffect, useRef, useState } from 'react';
import { useFaceLandmarker } from '../face/useFaceLandmarker';
import { PLACEHOLDER_CARICATURES, type Caricature } from '../game/caricatures';
import { blendshapesToMap, scoreMatch, updateHold, type HoldState } from '../game/matcher';
import { playWhistle } from '../audio/whistle';
import { pickHint } from '../game/hintCopy';
import { captureFrame, clearFrames } from '../capture/whistleFrameStore';
import type { RoundResult, RunResult } from '../game/run';
import { formatTime } from '../share/share';
import { track } from '../analytics/track';

const DEFAULT_CAP_MS = 20000;

type Props = {
  threshold: number;
  holdMs: number;
  debug: boolean;
  onComplete: (result: RunResult) => void;
};

export function Playing({ threshold, holdMs, debug, onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [runStart, setRunStart] = useState<number | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const [score, setScore] = useState(0);
  const [locked, setLocked] = useState(false);
  const [liveMap, setLiveMap] = useState<Record<string, number>>({});
  const [hint, setHint] = useState<string | null>(null);

  const holdRef = useRef<HoldState>({ aboveSince: null, locked: false });
  const roundStartRef = useRef<number>(performance.now());
  const sinceBelowRef = useRef<number>(performance.now());
  const lastHintRef = useRef<string | null>(null);

  const c: Caricature = PLACEHOLDER_CARICATURES[index];
  const total = PLACEHOLDER_CARICATURES.length;
  const capMs = c.capMs ?? DEFAULT_CAP_MS;
  // Per-face threshold override (caricatures can be tuned individually);
  // falls back to the global URL-param threshold.
  const effectiveThreshold = c.threshold ?? threshold;

  // Reset for each round
  useEffect(() => {
    setScore(0);
    setLocked(false);
    setLiveMap({});
    setHint(null);
    holdRef.current = { aboveSince: null, locked: false };
    roundStartRef.current = performance.now();
    sinceBelowRef.current = performance.now();
    lastHintRef.current = null;
  }, [index]);

  // Cleanup any stale captures from a prior session on mount
  useEffect(() => {
    clearFrames();
  }, []);

  // Tick for timer + countdown ring
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const advance = useCallback(
    (missed: boolean) => {
      // For locks we already captured at the whistle moment in onFrame; don't
      // overwrite with a later (post-burst) frame. For misses, capture now.
      if (missed) {
        const v = videoRef.current;
        if (v) captureFrame(c.id, v, true);
      }
      const elapsed = performance.now() - roundStartRef.current;
      const round: RoundResult = { caricatureId: c.id, timeMs: elapsed, missed };
      const nextResults = [...results, round];
      setResults(nextResults);
      track('round_complete', {
        caricature_id: c.id,
        round_index: index,
        time_ms: Math.round(elapsed),
        missed,
      });
      if (index + 1 >= total) {
        const start = runStart ?? performance.now();
        const totalMs = performance.now() - start;
        onComplete({ totalMs, rounds: nextResults });
      } else {
        setIndex(index + 1);
      }
    },
    [c.id, index, total, results, runStart, onComplete],
  );

  // Per-face cap watchdog (only after the run actually started)
  useEffect(() => {
    if (runStart == null) return;
    const elapsed = now - roundStartRef.current;
    if (!locked && elapsed >= capMs) {
      advance(true);
    }
  }, [now, capMs, locked, advance, runStart]);

  const onFrame = useCallback(
    (bs: import('../face/faceLandmarker').Blendshape[], video: HTMLVideoElement) => {
      if (runStart == null) {
        const t0 = performance.now();
        setRunStart(t0);
        roundStartRef.current = t0;
        sinceBelowRef.current = t0;
        track('run_start', { face_count: total });
      }
      const live = blendshapesToMap(bs);
      const s = scoreMatch(live, c);
      setScore(s);
      setLiveMap(live);
      const t = performance.now();
      const updated = updateHold(holdRef.current, s, effectiveThreshold, holdMs, t);
      const justLocked = !holdRef.current.locked && updated.locked;
      holdRef.current = updated;
      if (s >= effectiveThreshold) {
        sinceBelowRef.current = t;
      }
      if (justLocked && !locked) {
        setLocked(true);
        playWhistle();
        captureFrame(c.id, video, false);
        setTimeout(() => advance(false), 250);
      }
      // Hint: refresh only when top gap key changes, after 3s below threshold
      const belowFor = t - sinceBelowRef.current;
      if (s < effectiveThreshold && belowFor > 3000) {
        const next = pickHint(c.target, live);
        if (next !== lastHintRef.current) {
          lastHintRef.current = next;
          setHint(next);
        }
      } else {
        if (lastHintRef.current !== null) {
          lastHintRef.current = null;
          setHint(null);
        }
      }
    },
    [c, effectiveThreshold, holdMs, locked, advance, runStart, total],
  );

  const { status, error, fps, landmarks } = useFaceLandmarker(videoRef, { onFrame });
  void landmarks;

  // Fire camera outcome once per session
  const cameraOutcomeRef = useRef<'granted' | 'error' | null>(null);
  useEffect(() => {
    if (status === 'running' && cameraOutcomeRef.current !== 'granted') {
      cameraOutcomeRef.current = 'granted';
      track('camera_granted');
    } else if (status === 'error' && cameraOutcomeRef.current !== 'error') {
      cameraOutcomeRef.current = 'error';
      track('camera_error', { message: error ?? 'unknown' });
    }
  }, [status, error]);

  const elapsedRound = runStart == null ? 0 : now - roundStartRef.current;
  const ringPct = Math.max(0, Math.min(1, 1 - elapsedRound / capMs));
  const totalElapsed = runStart == null ? 0 : now - runStart;

  const meterPct = Math.round(score * 100);
  const thresholdPct = Math.round(effectiveThreshold * 100);
  const ringDeg = Math.round(ringPct * 360);
  const ringColor = ringPct < 0.2 ? '#ff3b3b' : ringPct < 0.4 ? '#ffaa33' : '#06d6a0';

  const showHint = hint && !locked;
  const debugLm = debug ? landmarks ?? [] : [];

  return (
    <div className="round">
      <video ref={videoRef} className="round-video" playsInline muted />

      {status !== 'running' && !error && (
        <div className="overlay">
          <div className="overlay-spinner" />
          <div className="overlay-msg">
            {status === 'loading-model'
              ? 'The refs are checking the tape...'
              : status === 'requesting-camera'
              ? 'Allow camera in the prompt'
              : 'Starting...'}
          </div>
        </div>
      )}
      {error && (
        <div className="overlay overlay--error">
          <div className="overlay-msg">No camera, no whistle.</div>
          <div className="overlay-detail">{error}</div>
        </div>
      )}

      {debug && debugLm.length > 0 && <DebugLandmarks points={debugLm} />}

      <div className="round-top">
        <div className="round-strip">
          {PLACEHOLDER_CARICATURES.map((cc, i) => {
            const r = results.find((rr) => rr.caricatureId === cc.id);
            const state =
              i < index ? (r?.missed ? 'missed' : 'done') : i === index ? 'current' : 'upcoming';
            return <span key={cc.id} className={`round-dot round-dot--${state}`} />;
          })}
        </div>
        <div className="round-timer">{formatTime(totalElapsed)}</div>
      </div>

      <div className={`round-badge round-badge--tl ${locked ? 'round-badge--burst' : ''}`}>
        <div
          className="round-badge-ring"
          style={{
            background: `conic-gradient(${ringColor} ${ringDeg}deg, rgba(255,255,255,0.12) ${ringDeg}deg)`,
          }}
        >
          <div className="round-badge-inner">
            {c.photo ? (
              <img src={c.photo} alt={c.label} className="round-badge-photo" />
            ) : (
              <div className="round-badge-emoji">{c.emoji}</div>
            )}
          </div>
        </div>
      </div>

      {showHint && <div className="round-hint">{hint}</div>}

      <div className="round-meter-wrap">
        <div className="round-meter-labels">
          <span>Match {meterPct}%</span>
          <span className="round-meter-labels-right">
            Whistle <span aria-hidden>📣</span>
          </span>
        </div>
        <div className="round-meter">
          <div
            className={`round-meter-fill ${score >= effectiveThreshold ? 'round-meter-fill--hot' : ''}`}
            style={{ width: `${meterPct}%` }}
          />
          <div className="round-meter-threshold" style={{ left: `${thresholdPct}%` }} />
        </div>
      </div>

      {debug && (
        <div className="round-debug">
          {fps} fps · {Object.keys(c.target).length} keys · score {meterPct}%
          <br />
          {Object.entries(c.target)
            .map(([k, t]) => `${k}: ${(liveMap[k] ?? 0).toFixed(2)}/${t.toFixed(2)}`)
            .join('  ')}
        </div>
      )}
    </div>
  );
}

function DebugLandmarks({ points }: { points: { x: number; y: number }[] }) {
  return (
    <svg className="round-landmarks" viewBox="0 0 1 1" preserveAspectRatio="xMidYMid slice">
      {points.map((p, i) => (
        <circle key={i} cx={1 - p.x} cy={p.y} r={0.0025} fill="#06d6a0" />
      ))}
    </svg>
  );
}
