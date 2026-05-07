import { useMemo, useRef, useState } from 'react';
import { useFaceLandmarker } from '../face/useFaceLandmarker';

export function Spike() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <div className="center">
        <div>
          <h1 style={{ marginTop: 0 }}>Foul Bait — Tech Spike</h1>
          <p style={{ maxWidth: 360, color: '#a0a0aa' }}>
            Milestone 1: webcam + MediaPipe FaceLandmarker. Pull a stupid face, watch the
            blendshape bars react in real time.
          </p>
          <button onClick={() => setStarted(true)}>Start camera</button>
        </div>
      </div>
    );
  }

  return <Stage videoRef={videoRef} />;
}

function Stage({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const { status, error, blendshapes, fps } = useFaceLandmarker(videoRef);

  const top = useMemo(() => {
    return blendshapes
      .filter((b) => b.name !== '_neutral')
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [blendshapes]);

  return (
    <div className="spike">
      <header>
        <h1>Foul Bait · Spike</h1>
        <span style={{ fontSize: 12, color: '#a0a0aa' }}>
          {status} · {fps} fps
        </span>
      </header>
      <div className="stage">
        <div className="video-wrap">
          <video ref={videoRef} playsInline muted />
          {status !== 'running' && (
            <div className="badge">
              {status === 'loading-model'
                ? 'loading model…'
                : status === 'requesting-camera'
                ? 'requesting camera…'
                : status}
            </div>
          )}
          {error && <div className="badge error">{error}</div>}
        </div>
        <div className="panel">
          <h2>Top blendshapes</h2>
          {top.length === 0 ? (
            <div style={{ color: '#666', fontSize: 13 }}>Waiting for face…</div>
          ) : (
            top.map((b) => (
              <div key={b.name} className="bs-row">
                <span className="name">{b.name}</span>
                <span className="val">{b.score.toFixed(2)}</span>
                <div className="bar">
                  <span style={{ width: `${Math.min(100, b.score * 100)}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
