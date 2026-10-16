/**
 * Speed-based scoring.
 *
 * Every question has a base value (`points`). A correct answer always earns at
 * least half of that value and up to the full value, scaled linearly by how
 * quickly the player locked in their answer. Incorrect answers earn nothing.
 */

/** Points multiplier applied to a question's `points` value (a "point" = 100). */
export const BASE_POINT_MULTIPLIER = 100;

/** Answers slower than this window earn only the minimum (base) reward. */
export const SPEED_WINDOW_SECONDS = 30;

/** Slowest possible multiplier for a correct answer (fastest earns 1.0). */
const MIN_SPEED_FACTOR = 0.5;

/**
 * Returns the points awarded for a single answer.
 *
 * @param points  The question's configured point value.
 * @param isCorrect  Whether the submitted answer was correct.
 * @param timeTakenSeconds  How long the player took to answer, if known.
 */
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
