import type { Blendshape } from '../face/faceLandmarker';
import type { Caricature } from './caricatures';

export function blendshapesToMap(bs: Blendshape[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { name, score } of bs) out[name] = score;
  return out;
}

/**
 * Match score in [0, 1]. Each target blendshape contributes its activation
 * ratio (live / target), clamped at 1 so overshoot doesn't hurt. Final score
 * is a weighted average across the target's dimensions.
 *
 * - Neutral face → 0 (all ratios are 0)
 * - All target dims at or above target → 1
 * - Partial match → weighted average of partials
 */
export function scoreMatch(live: Record<string, number>, c: Caricature): number {
  const keys = Object.keys(c.target);
  if (keys.length === 0) return 0;

  let weighted = 0;
  let weightSum = 0;
  for (const k of keys) {
    const target = c.target[k];
    if (target <= 0) continue;
    const actual = live[k] ?? 0;
    const w = c.weights?.[k] ?? 1;
    const ratio = Math.min(1, actual / target);
    weighted += w * ratio;
    weightSum += w;
  }
  return weightSum > 0 ? weighted / weightSum : 0;
}

export type HoldState = { aboveSince: number | null; locked: boolean };

export function updateHold(
  state: HoldState,
  score: number,
  threshold: number,
  holdMs: number,
  now: number,
): HoldState {
  if (state.locked) return state;
  if (score >= threshold) {
    const aboveSince = state.aboveSince ?? now;
    return { aboveSince, locked: now - aboveSince >= holdMs };
  }
  return { aboveSince: null, locked: false };
}
