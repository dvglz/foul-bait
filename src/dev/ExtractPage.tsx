import { useCallback, useRef, useState } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let stillLandmarker: Promise<FaceLandmarker> | null = null;
function getStillLandmarker(): Promise<FaceLandmarker> {
  if (!stillLandmarker) {
    stillLandmarker = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: false,
        runningMode: 'IMAGE',
        numFaces: 1,
      });
    })();
  }
  return stillLandmarker;
}

type Extraction = {
  blendshapes: Record<string, number>;
  topActive: string[];
  landmarkCount: number;
};

export function ExtractPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [result, setResult] = useState<Extraction | null>(null);
  const [activeKeysInput, setActiveKeysInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setStatus('loading');
    setError(null);
    setResult(null);
    setCopied(false);
    setFilename(file.name);
    try {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      URL.revokeObjectURL(url);

      const canvas = canvasRef.current!;
      const max = 768;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const lm = await getStillLandmarker();
      const r: FaceLandmarkerResult = lm.detect(canvas);

      const cats = r.faceBlendshapes?.[0]?.categories;
      if (!cats || cats.length === 0) {
        throw new Error('No face detected. Re-frame so the face fills 60-80% of the frame, upright.');
      }
      const blendshapes: Record<string, number> = {};
      for (const c of cats) {
        if (c.categoryName !== '_neutral') blendshapes[c.categoryName] = round(c.score);
      }

      const topActive = Object.entries(blendshapes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([k]) => k);

      const points = r.faceLandmarks?.[0] ?? [];
      ctx.fillStyle = '#06d6a0';
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      setResult({ blendshapes, topActive, landmarkCount: points.length });
      setActiveKeysInput(topActive.join(', '));
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const activeKeys = activeKeysInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const snippet = result ? buildSnippet(filename, result.blendshapes, activeKeys) : '';

  const onCopy = useCallback(async () => {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [snippet]);

  return (
    <div className="extract">
      <header>
        <h1>Foul Bait · Extract</h1>
        <span style={{ fontSize: 12, color: '#a0a0aa' }}>dev only · {status}</span>
      </header>
      <div className="extract-body">
        <div
          className="extract-drop"
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <canvas ref={canvasRef} className="extract-canvas" />
          {!result && (
            <label className="extract-pick">
              <input type="file" accept="image/*" onChange={onPick} hidden />
              <span>drop a face photo or click to pick</span>
            </label>
          )}
          {error && <div className="error">{error}</div>}
        </div>

        <div className="extract-panel">
          {result ? (
            <>
              <h2>Active keys</h2>
              <textarea
                className="extract-keys"
                value={activeKeysInput}
                onChange={(e) => setActiveKeysInput(e.target.value)}
                rows={2}
              />
              <p style={{ fontSize: 11, color: '#666', margin: '4px 0 12px' }}>
                {result.landmarkCount} landmarks · top 5 by activation suggested
              </p>

              <h2>Snippet</h2>
              <pre className="extract-snippet">{snippet}</pre>
              <button onClick={onCopy} style={{ marginTop: 8 }}>
                {copied ? 'Copied!' : 'Copy snippet'}
              </button>
            </>
          ) : (
            <div style={{ color: '#666', fontSize: 13 }}>
              Drop a 512–1024px square photo. Face upright, fills most of the frame.
              <br />
              No headband, no jersey, no NBA chrome — just face.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function buildSnippet(
  filename: string | null,
  extracted: Record<string, number>,
  activeKeys: string[],
): string {
  const id = filename
    ? filename.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    : 'caricature-id';
  const photo = filename ? `/faces/${filename}` : '/faces/your-photo.jpg';
  return [
    `{`,
    `  id: '${id}',`,
    `  label: 'Label here',`,
    `  emoji: '😐',`,
    `  photo: '${photo}',`,
    `  activeKeys: ${JSON.stringify(activeKeys)},`,
    `  extracted: ${JSON.stringify(extracted, null, 2).replace(/\n/g, '\n  ')},`,
    `  weights: {},`,
    `},`,
  ].join('\n');
}
