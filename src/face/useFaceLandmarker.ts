import { useEffect, useRef, useState } from 'react';
import { getFaceLandmarker, extractBlendshapes, type Blendshape } from './faceLandmarker';

type Status = 'idle' | 'loading-model' | 'requesting-camera' | 'running' | 'error';

type Options = {
  onFrame?: (bs: Blendshape[], video: HTMLVideoElement) => void;
};

export function useFaceLandmarker(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: Options = {},
) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [blendshapes, setBlendshapes] = useState<Blendshape[]>([]);
  const [fps, setFps] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const frameTimesRef = useRef<number[]>([]);
  const onFrameRef = useRef(options.onFrame);
  onFrameRef.current = options.onFrame;

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;

    (async () => {
      try {
        setStatus('loading-model');
        console.log('[face] loading model');
        const landmarker = await Promise.race([
          getFaceLandmarker(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Model load timed out. On iOS, make sure you're on Safari 16+ and have a stable connection.",
                  ),
                ),
              25000,
            ),
          ),
        ]);
        if (cancelled) return;

        console.log('[face] model loaded, requesting camera');
        setStatus('requesting-camera');
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            'Camera not available. iOS Safari requires HTTPS — open this page via the https:// URL.',
          );
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) return;

        const video = videoRef.current;
        if (!video) throw new Error('Video element not mounted');
        video.srcObject = stream;
        try {
          await video.play();
        } catch (playErr) {
          console.warn('[face] video.play() rejected:', playErr);
        }
        console.log('[face] video playing, dims', video.videoWidth, video.videoHeight);

        setStatus('running');

        const tick = () => {
          if (cancelled) return;
          const v = videoRef.current;
          if (v && v.readyState >= 2 && v.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = v.currentTime;
            const result = landmarker.detectForVideo(v, performance.now());
            const bs = extractBlendshapes(result);
            if (bs.length) {
              setBlendshapes(bs);
              onFrameRef.current?.(bs, v);
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
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [videoRef]);

  return { status, error, blendshapes, fps };
}
