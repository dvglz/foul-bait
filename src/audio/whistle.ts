const WHISTLE_URL = '/audio/whistle.mp3';

let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let loadPromise: Promise<void> | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/**
 * Must be called from a user-gesture event handler. iOS Safari leaves the
 * AudioContext suspended until you call resume() AND play something during
 * the gesture — playing a tiny silent buffer here is what actually unlocks it.
 */
export function unlockAudio() {
  const c = getCtx();
  void c.resume();
  const silent = c.createBuffer(1, 1, 22050);
  const src = c.createBufferSource();
  src.buffer = silent;
  src.connect(c.destination);
  src.start();
}

export function preloadWhistle(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const c = getCtx();
    const res = await fetch(WHISTLE_URL);
    const arr = await res.arrayBuffer();
    buffer = await c.decodeAudioData(arr);
  })();
  return loadPromise;
}

export function playWhistle() {
  const c = getCtx();
  if (c.state === 'suspended') void c.resume();
  if (!buffer) {
    void preloadWhistle();
    return;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.connect(c.destination);
  src.start();
}
