const COPY: Record<string, string> = {
  jawOpen: 'open wider',
  mouthPucker: 'pucker up',
  mouthSmileLeft: 'smile bigger',
  mouthSmileRight: 'smile bigger',
  mouthFrownLeft: 'frown harder',
  mouthFrownRight: 'frown harder',
  mouthStretchLeft: 'stretch your mouth',
  mouthStretchRight: 'stretch your mouth',
  mouthPressLeft: 'press your lips',
  mouthPressRight: 'press your lips',
  mouthLowerDownLeft: 'drop your jaw',
  mouthLowerDownRight: 'drop your jaw',
  mouthUpperUpLeft: 'lift your upper lip',
  mouthUpperUpRight: 'lift your upper lip',
  mouthFunnel: 'funnel your mouth',
  browInnerUp: 'raise your brows',
  browOuterUpLeft: 'raise your brows',
  browOuterUpRight: 'raise your brows',
  browDownLeft: 'scowl',
  browDownRight: 'scowl',
  eyeWideLeft: 'open your eyes wide',
  eyeWideRight: 'open your eyes wide',
  eyeSquintLeft: 'squint harder',
  eyeSquintRight: 'squint harder',
  noseSneerLeft: 'sneer',
  noseSneerRight: 'sneer',
  cheekSquintLeft: 'cheek-squint',
  cheekSquintRight: 'cheek-squint',
};

/**
 * Returns the natural-language hint for whichever active target blendshape has
 * the largest gap (target - live). null if nothing is meaningfully short.
 */
export function pickHint(
  target: Record<string, number>,
  live: Record<string, number>,
  minGap = 0.15,
): string | null {
  let bestKey: string | null = null;
  let bestGap = minGap;
  for (const k in target) {
    const t = target[k];
    if (t <= 0) continue;
    const gap = t - (live[k] ?? 0);
    if (gap > bestGap) {
      bestGap = gap;
      bestKey = k;
    }
  }
  return bestKey ? COPY[bestKey] ?? null : null;
}
