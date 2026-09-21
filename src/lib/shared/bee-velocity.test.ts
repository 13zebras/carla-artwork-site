import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBeeDistanceStepper } from '@/lib/shared/bee-velocity';

const options = {
  minVelocity: 80,
  maxVelocity: 120,
  minTransitionMs: 4_000,
  maxTransitionMs: 8_000,
};

afterEach(() => vi.restoreAllMocks());

describe('bee velocity', () => {
  it('integrates gradual acceleration and deceleration, carrying time across targets', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(1) // First target: 120px/s.
      .mockReturnValueOnce(0) // Four seconds.
      .mockReturnValueOnce(0) // Next target: 80px/s.
      .mockReturnValueOnce(0) // Four seconds.
      .mockReturnValue(0);
    const advance = createBeeDistanceStepper(options);
    // Starts at 100. Smoothstep averages the two endpoint velocities.
    expect(advance(8_000)).toBeCloseTo(4 * 110 + 4 * 100);
    expect(advance(1_000)).toBeCloseTo(80);
  });

  it('eases velocity continuously through a target, with gentle acceleration at both ends', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(1).mockReturnValueOnce(0).mockReturnValue(0);
    const advance = createBeeDistanceStepper(options);
    const velocities = Array.from({ length: 800 }, () => advance(10) / 0.01);
    expect(velocities[0]).toBeCloseTo(100, 3);
    expect(velocities[199]).toBeCloseTo(110, 0);
    expect(velocities[399]).toBeCloseTo(120, 3);
    expect(velocities[400]).toBeCloseTo(120, 3);
    expect(velocities[799]).toBeCloseTo(80, 3);
    for (let index = 1; index < 400; index++) {
      expect(velocities[index]).toBeGreaterThan(velocities[index - 1]);
    }
    for (let index = 401; index < velocities.length; index++) {
      expect(velocities[index]).toBeLessThan(velocities[index - 1]);
    }
    const startingChange = velocities[1] - velocities[0];
    const middleChange = velocities[200] - velocities[199];
    const endingChange = velocities[399] - velocities[398];
    expect(startingChange).toBeLessThan(middleChange / 50);
    expect(endingChange).toBeLessThan(middleChange / 50);
  });

  it.each([0, 0.25, 0.5, 0.75, 1])('keeps velocity inside its bounds with random = %s', (seed) => {
    vi.spyOn(Math, 'random').mockReturnValue(seed);
    const advance = createBeeDistanceStepper(options);
    for (let frame = 0; frame < 3600; frame++) {
      const velocity = advance(1000 / 60) * 60;
      expect(velocity).toBeGreaterThanOrEqual(80 - 1e-8);
      expect(velocity).toBeLessThanOrEqual(120 + 1e-8);
    }
  });

  it('travels the same distance at different frame rates and across delayed frames', () => {
    const random = vi.spyOn(Math, 'random');
    function travel(frameMs: number) {
      let seed = 42;
      random.mockImplementation(() => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      });
      const advance = createBeeDistanceStepper(options);
      let distance = 0;
      let remaining = 27_123;
      while (remaining > 0) {
        const step = Math.min(remaining, frameMs);
        distance += advance(step);
        remaining -= step;
      }
      return distance;
    }
    const expected = travel(27_123);
    for (const frameMs of [1000 / 30, 1000 / 60, 1000 / 144, 500]) {
      expect(travel(frameMs)).toBeCloseTo(expected, 7);
    }
  });

  it('does not advance or select a new target when no time has elapsed', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(1);
    const advance = createBeeDistanceStepper(options);
    random.mockClear();
    expect(advance(0)).toBe(0);
    expect(random).not.toHaveBeenCalled();
    expect(advance(10) / 0.01).toBeCloseTo(100, 3);
  });
});
