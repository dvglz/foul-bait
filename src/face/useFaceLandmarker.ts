import { useEffect, useRef, useState } from 'react';
import { getFaceLandmarker, extractBlendshapes, type Blendshape } from './faceLandmarker';

type Status = 'idle' | 'loading-model' | 'requesting-camera' | 'running' | 'error';

let cachedStream: MediaStream | null = null;
async function getStream(): Promise<MediaStream> {
  if (cachedStream && cachedStream.getVideoTracks().some((t) => t.readyState === 'live')) {
    return cachedStream;
  }
  cachedStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  return cachedStream;
}

type Point = { x: number; y: number };

type Options = {
  onFrame?: (bs: Blendshape[], video: HTMLVideoElement) => void;
  onLandmarks?: (pts: Point[]) => void;
};

export function useFaceLandmarker(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: Options = {},
) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [blendshapes, setBlendshapes] = useState<Blendshape[]>([]);
  const [landmarks, setLandmarks] = useState<Point[]>([]);
  const [fps, setFps] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const frameTimesRef = useRef<number[]>([]);
  const onFrameRef = useRef(options.onFrame);
  const onLandmarksRef = useRef(options.onLandmarks);
  onFrameRef.current = options.onFrame;
  onLandmarksRef.current = options.onLandmarks;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setStatus('loading-model');
        const landmarker = await Promise.race([
          getFaceLandmarker(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    'The refs are stuck in traffic. Refresh in a sec.',
                  ),
                ),
              25000,
            ),
          ),
        ]);
        if (cancelled) return;

        setStatus('requesting-camera');
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'Camera not available. iOS Safari requires HTTPS — open this page via the https:// URL.',
          );
        }
        const stream = await getStream();
        if (cancelled) return;

        const video = videoRef.current;
        if (!video) throw new Error('Video element not mounted');
        video.srcObject = stream;
        try {
          await video.play();
        } catch (playErr) {
          console.warn('[face] video.play() rejected:', playErr);
        }

        setStatus('running');

        const tick = () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v && v.readyState >= 2 && v.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = v.currentTime;
            const result = landmarker.detectForVideo(v, performance.now());
            const bs = extractBlendshapes(result);
            const pts = result.faceLandmarks?.[0] ?? [];
            if (bs.length) {
              setBlendshapes(bs);
              onFrameRef.current?.(bs, v);
            }
            if (pts.length) {
              setLandmarks(pts);
              onLandmarksRef.current?.(pts);
            }

            const now = performance.now();
            const arr = frameTimesRef.current;
            arr.push(now);
            while (arr.length && arr[0] < now - 1000) arr.shift();
            setFps(arr.length);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        if (cancelled) return;
        console.error('[face] init failed:', e);
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      // Intentionally NOT stopping the stream — we cache it across remounts
      // so "Play again" doesn't re-prompt the user (esp. iOS Safari).
    };
  }, [videoRef]);

  return { status, error, blendshapes, landmarks, fps };
}
