/**
 * Captures and stores the player's webcam frame at the moment a face was
 * locked (or timed out). Keyed by caricature id. Frames are stored as PNG
 * data URLs so they can be drawn into the share grid later.
 */

const frames = new Map<string, string>();
let canvas: HTMLCanvasElement | null = null;

function getCanvas(): HTMLCanvasElement {
  if (!canvas) canvas = document.createElement('canvas');
  return canvas;
}

export function captureFrame(id: string, video: HTMLVideoElement, missed = false): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const c = getCanvas();
  const size = 360;
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  // Capture raw (un-mirrored) pixels. The presenter (Results CSS, gridRenderer)
  // applies the mirror so the stored frame stays canonical.
  const vAspect = video.videoWidth / video.videoHeight;
  let sx = 0,
    sy = 0,
    sw = video.videoWidth,
    sh = video.videoHeight;
  if (vAspect > 1) {
    sw = video.videoHeight;
    sx = (video.videoWidth - sw) / 2;
  } else if (vAspect < 1) {
    sh = video.videoWidth;
    sy = (video.videoHeight - sh) / 2;
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, size, size);
  if (missed) {
    ctx.fillStyle = 'rgba(255, 60, 60, 0.18)';
    ctx.fillRect(0, 0, size, size);
  }
  const url = c.toDataURL('image/jpeg', 0.85);
  frames.set(id, url);
  return url;
}

export function getFrame(id: string): string | null {
  return frames.get(id) ?? null;
}

export function clearFrames() {
  frames.clear();
}
