/**
 * Frontend mirror of the backend speed-based scoring so the completion screen
 * can show an accurate score before/without a server round-trip.
 */
export const BASE_POINT_MULTIPLIER = 100;
export const SPEED_WINDOW_SECONDS = 30;
const MIN_SPEED_FACTOR = 0.5;

export function computeAnswerPoints(
  points: number,
  isCorrect: boolean,
  timeTakenSeconds?: number | null,
): number {
  if (!isCorrect) return 0;

  const max = points * BASE_POINT_MULTIPLIER;
  if (typeof timeTakenSeconds !== "number" || !Number.isFinite(timeTakenSeconds)) {
    return max;
  }

  const clamped = Math.max(0, Math.min(timeTakenSeconds, SPEED_WINDOW_SECONDS));
  const ratio = clamped / SPEED_WINDOW_SECONDS;
  const speedFactor = 1 - (1 - MIN_SPEED_FACTOR) * ratio;

  return Math.round(max * speedFactor);
}
