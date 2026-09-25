import { describe, expect, it } from 'vitest';

import type { BeePoint } from '@/lib/shared/bee-animation';
import {
  createBeeCourseChanges,
  createBeeQuadrantTravel,
} from '@/lib/shared/bee-quadrant-travel';

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe('bee held course changes', () => {
  it.each([
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ])('gradually turns, then holds each new heading (%s, %s)', (firstSign, secondSign) => {
    const choices = [0, (firstSign + 1) / 2, 1, (secondSign + 1) / 2];
    let index = 0;
    const course = createBeeCourseChanges(
      { x: 100, y: 200, angle: 0 },
      400,
      5,
      12,
      () => choices[index++],
    );
    const firstHeading = (firstSign * 5 * Math.PI) / 180;
    const secondHeading = firstHeading + (secondSign * 12 * Math.PI) / 180;
    expect(course.turns).toEqual([firstSign * 5, secondSign * 12]);
    expect(course.pointAt(0).angle).toBe(0);
    expect(course.pointAt(0.125).angle).toBeCloseTo(firstHeading / 2, 8);
    expect(course.pointAt(0.3).angle).toBeCloseTo(firstHeading, 8);
    expect(course.pointAt(0.45).angle).toBeCloseTo(firstHeading, 8);
    expect(course.pointAt(0.625).angle).toBeCloseTo((firstHeading + secondHeading) / 2, 8);
    expect(course.pointAt(0.8).angle).toBeCloseTo(secondHeading, 8);
    expect(course.pointAt(1).angle).toBeCloseTo(secondHeading, 8);
    // Heading must change the flight path, not merely the icon's rotation.
    const from = course.pointAt(0.8);
    const to = course.pointAt(1);
    expect(Math.atan2(to.y - from.y, to.x - from.x)).toBeCloseTo(secondHeading, 8);
    let previous = course.pointAt(0);
    let maximumTurn = 0;
    let maximumDistanceError = 0;
    for (let step = 1; step <= 1000; step++) {
      const point = course.pointAt(step / 1000);
      maximumTurn = Math.max(maximumTurn, Math.abs(point.angle - previous.angle));
      maximumDistanceError = Math.max(
        maximumDistanceError,
        Math.abs(Math.hypot(point.x - previous.x, point.y - previous.y) - 0.4),
      );
      previous = point;
    }
    expect(maximumTurn).toBeLessThan(0.001);
    expect(maximumDistanceError).toBeLessThan(1e-5);
    expect(index).toBe(4);
  });

  it.each([true, false])(
    'navigates to the quadrant with exactly two committed turns (exclude center=%s)',
    (excludeCenter) => {
      function isSafe(points: BeePoint[]) {
        if (points.some((p) => p.x < 10 || p.x > 990 || p.y < 10 || p.y > 790)) return false;
        if (!excludeCenter) return true;
        return (
          points.every((p) => p.x <= 390) ||
          points.every((p) => p.x >= 610) ||
          points.every((p) => p.y <= 310) ||
          points.every((p) => p.y >= 490)
        );
      }
      const result = createBeeQuadrantTravel(
        { x: 100, y: 400, angle: 0 },
        { x: 800, y: 160 },
        {
          radius: 30,
          minTurn: 5,
          maxTurn: 12,
          isSafe,
          isTarget: (point) => point.x > 600 && point.y < 320,
          finish: (point) => point.x > 600 && point.y < 320,
        },
        seededRandom(21),
      );
      if (!result) throw new Error('No safe heading-based relocation');
      expect(result.turns).toHaveLength(2);
      for (const turn of result.turns) {
        expect(Math.abs(turn)).toBeGreaterThanOrEqual(5);
        expect(Math.abs(turn)).toBeLessThanOrEqual(12);
      }
      for (let index = 1; index < result.points.length; index++) {
        if (!isSafe([result.points[index - 1], result.points[index]]))
          throw new Error('Unsafe steering step');
      }
    },
  );

  it('uses configurable angles, including zero without invalid positions', () => {
    const tuned = createBeeCourseChanges({ x: 0, y: 0, angle: 0 }, 400, 2, 4, () => 0.75);
    expect(tuned.turns).toEqual([3.5, 3.5]);
    const straight = createBeeCourseChanges({ x: 0, y: 0, angle: 0 }, 400, 0, 0, () => 0.5);
    expect(straight.end).toEqual({ x: 400, y: 0, angle: 0 });
  });
});
