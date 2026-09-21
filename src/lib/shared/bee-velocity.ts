type BeeVelocityOptions = {
  minVelocity: number;
  maxVelocity: number;
  minTransitionMs: number;
  maxTransitionMs: number;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Integral of smoothstep (3t² - 2t³), for frame-rate-independent distance.
function integratedSmoothstep(t: number) {
  return t ** 3 - t ** 4 / 2;
}

/** Returns CSS pixels travelled during an elapsed interval in milliseconds.
 * Starts at the midpoint velocity; each new target is eased into without
 * resetting velocity or abruptly changing acceleration at the transition.
 */
export function createBeeDistanceStepper({
  minVelocity,
  maxVelocity,
  minTransitionMs,
  maxTransitionMs,
}: BeeVelocityOptions) {
  let from = (minVelocity + maxVelocity) / 2;
  let to = randomBetween(minVelocity, maxVelocity);
  let duration = randomBetween(minTransitionMs, maxTransitionMs);
  let elapsed = 0;

  return function advanceDistance(deltaMs: number): number {
    let remaining = deltaMs;
    let distance = 0;

    // Carry time across transition boundaries, including a delayed frame.
    while (remaining > 0) {
      const step = Math.min(remaining, duration - elapsed);
      const start = elapsed / duration;
      const end = (elapsed + step) / duration;
      const easedArea = integratedSmoothstep(end) - integratedSmoothstep(start);
      distance += (from * step + (to - from) * duration * easedArea) / 1000;
      elapsed += step;
      remaining -= step;

      if (elapsed >= duration) {
        from = to;
        to = randomBetween(minVelocity, maxVelocity);
        duration = randomBetween(minTransitionMs, maxTransitionMs);
        elapsed = 0;
      }
    }

    return distance;
  };
}
