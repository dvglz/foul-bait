import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function createLandmarker(delegate: 'GPU' | 'CPU'): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
    runningMode: 'VIDEO',
    numFaces: 1,
  });
}

export function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      // GPU delegate hangs on iOS Safari — use CPU there. CPU is fine for a
      // single face at ~30fps and avoids the WebGL/WASM-SIMD issues.
      if (isIOS) return createLandmarker('CPU');
      try {
        return await createLandmarker('GPU');
      } catch {
        return createLandmarker('CPU');
      }
    })();
  }
  return landmarkerPromise;
}

export type Blendshape = { name: string; score: number };

export function extractBlendshapes(result: FaceLandmarkerResult): Blendshape[] {
  const categories = result.faceBlendshapes?.[0]?.categories;
  if (!categories) return [];
  return categories.map((c) => ({ name: c.categoryName, score: c.score }));
}
