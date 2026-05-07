import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFaceLandmarker } from '../face/useFaceLandmarker';
import { PLACEHOLDER_CARICATURES, type Caricature } from '../game/caricatures';
import { blendshapesToMap, scoreMatch, updateHold, type HoldState } from '../game/matcher';
import { playWhistle, preloadWhistle, unlockAudio } from '../audio/whistle';

type Props = {
  threshold: number;
  holdMs: number;
};

export function Playing({ threshold, holdMs }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const next = useCallback(
    () => setIndex((i) => (i + 1) % PLACEHOLDER_CARICATURES.length),
    [],
  );
  const prev = useCallback(
    () =>
      setIndex((i) => (i - 1 + PLACEHOLDER_CARICATURES.length) % PLACEHOLDER_CARICATURES.length),
    [],
  );

  if (!started) {
    return (
      <div className="center">
        <div>
          <h1 style={{ marginTop: 0 }}>Foul Bait</h1>
          <p style={{ maxWidth: 360, color: '#a0a0aa' }}>
            Mimic the face on screen. Hold the expression until the meter locks and the whistle
            blows.
          </p>
          <button
            onClick={() => {
              unlockAudio();
              void preloadWhistle();
              setStarted(true);
            }}
          >
            Start camera
          </button>
          <p style={{ fontSize: 12, color: '#666', marginTop: 16 }}>
            threshold {threshold.toFixed(2)} · hold {holdMs}ms ·{' '}
            {PLACEHOLDER_CARICATURES.length} faces
          </p>
        </div>
      </div>
    );
  }

  const c = PLACEHOLDER_CARICATURES[index];
  return (
    <Round
      videoRef={videoRef}
      caricature={c}
      threshold={threshold}
      holdMs={holdMs}
      indexLabel={`${index + 1} / ${PLACEHOLDER_CARICATURES.length}`}
      onNext={next}
      onPrev={prev}
    />
  );
}

function Round({
  videoRef,
  caricature: c,
  threshold,
  holdMs,
  indexLabel,
  onNext,
  onPrev,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  caricature: Caricature;
  threshold: number;
  holdMs: number;
  indexLabel: string;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [score, setScore] = useState(0);
  const [peak, setPeak] = useState(0);
  const [locked, setLocked] = useState(false);
  const [liveTarget, setLiveTarget] = useState<Record<string, number>>({});
  const holdRef = useRef<HoldState>({ aboveSince: null, locked: false });
  const peakRef = useRef(0);

  useEffect(() => {
    setScore(0);
    setPeak(0);
    setLocked(false);
    setLiveTarget({});
    holdRef.current = { aboveSince: null, locked: false };
    peakRef.current = 0;
  }, [c.id]);

  const debugKeys = useMemo(() => {
    const w = c.weights ?? {};
    return Object.keys(c.target)
      .sort((a, b) => (w[b] ?? 1) - (w[a] ?? 1))
      .slice(0, 4);
  }, [c]);

  const onFrame = useCallback(
    (bs: import('../face/faceLandmarker').Blendshape[]) => {
      const live = blendshapesToMap(bs);
      const s = scoreMatch(live, c);
      setScore(s);
      if (s > peakRef.current) {
        peakRef.current = s;
        setPeak(s);
      }
      const liveSubset: Record<string, number> = {};
      for (const k of debugKeys) liveSubset[k] = live[k] ?? 0;
      setLiveTarget(liveSubset);
      const updated = updateHold(holdRef.current, s, threshold, holdMs, performance.now());
      const justLocked = !holdRef.current.locked && updated.locked;
      holdRef.current = updated;
      if (justLocked) {
        setLocked(true);
        playWhistle();
      }
    },
    [c, threshold, holdMs, debugKeys],
  );

  const { status, error, fps } = useFaceLandmarker(videoRef, { onFrame });

  useEffect(() => {
    if (!locked) return;
    const t = setTimeout(onNext, 900);
    return () => clearTimeout(t);
  }, [locked, onNext]);

  const meterPct = Math.round(score * 100);
  const peakPct = Math.round(peak * 100);
  const thresholdPct = Math.round(threshold * 100);

  return (
    <div className="spike">
      <header>
        <h1>Foul Bait</h1>
        <span style={{ fontSize: 12, color: '#a0a0aa' }}>
          face {indexLabel} · {status} · {fps} fps
        </span>
      </header>
      <div className="stage">
        <div className="video-wrap">
          <video ref={videoRef} playsInline muted />
          {status !== 'running' && !error && (
            <div className="overlay">
              <div className="overlay-spinner" />
              <div className="overlay-msg">
                {status === 'loading-model'
                  ? 'Loading face model…'
                  : status === 'requesting-camera'
                  ? 'Allow camera access in the prompt'
                  : status === 'idle'
                  ? 'Starting…'
                  : status}
              </div>
            </div>
          )}
          {error && (
            <div className="overlay overlay--error">
              <div className="overlay-msg">Couldn't start the camera</div>
              <div className="overlay-detail">{error}</div>
            </div>
          )}
          {status === 'running' && debugKeys.length > 0 && (
            <div className="debug-overlay">
              {debugKeys.map((k) => {
                const live = liveTarget[k] ?? 0;
                const target = c.target[k];
                const hit = live >= target;
                return (
                  <div key={k} className={`debug-row ${hit ? 'debug-row--hit' : ''}`}>
                    <span className="debug-name">{k}</span>
                    <span className="debug-val">
                      {live.toFixed(2)} / {target.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="caricature">
            <div className="caricature-emoji" aria-label={c.label}>
              {c.emoji}
            </div>
            <div className="caricature-label">{c.label}</div>
            <div className="caricature-nav">
              <button className="btn-ghost" onClick={onPrev} aria-label="Previous face">
                ←
              </button>
              <button className="btn-ghost" onClick={onNext} aria-label="Next face">
                →
              </button>
            </div>
          </div>

          <div className="meter">
            <div
              className={`meter-fill ${score >= threshold ? 'meter-fill--hot' : ''}`}
              style={{ width: `${meterPct}%` }}
            />
            <div className="meter-peak" style={{ left: `${peakPct}%` }} />
            <div className="meter-threshold" style={{ left: `${thresholdPct}%` }} />
          </div>
          <div className="meter-readout">
            <span>match {meterPct}%</span>
            <span>peak {peakPct}%</span>
            <span>need ≥ {thresholdPct}%</span>
          </div>

          {locked ? (
            <div className="locked">
              <span className="locked-title">WHISTLE!</span>
              <span className="locked-sub">advancing…</span>
            </div>
          ) : (
            <div className="hint">
              Hold the face for {holdMs}ms once the bar passes the line.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
