import { describe, expect, it, vi } from 'vitest';

import {
  createBeeFlightPath,
  createBeeRoute,
  getBeePosition,
  getTrailOpacity,
  pruneBeeTrail,
} from '@/lib/shared/bee-animation';
import type { BeeRoute, BeeTurnDirection } from '@/lib/shared/bee-animation';

function fixedRoute(size: number): BeeRoute {
  return {
    loopWidth: Math.min(0.25, 0.16 * size),
    loopHeight: Math.min(0.19, 0.09 * size),
    coils: [
      { scale: 0.675, height: 0.04 },
      { scale: 0.95, height: 0.96 },
    ],
  };
}

const path = createBeeFlightPath(1200, 800, fixedRoute(2));
const position = (progress: number) => getBeePosition(progress, path);

function angleDifference(first: number, second: number) {
  return Math.abs(Math.atan2(Math.sin(second - first), Math.cos(second - first)));
}

describe('bee flight', () => {
  it.each([
    [0.25, 0.02],
    [0.75, 0.98],
  ])(
    'allows consecutive loops in the same vertical region when random is %s',
    (randomValue, expectedHeight) => {
      const random = vi.spyOn(Math, 'random').mockReturnValue(randomValue);
      try {
        const route = createBeeRoute(2, 3);
        for (const coil of route.coils) {
          expect(coil.height).toBeCloseTo(expectedHeight);
        }
      } finally {
        random.mockRestore();
      }
    },
  );

  it.each([1, 2, 3, 5])('generates and draws all %i configured coils', (loopCount) => {
    const route = createBeeRoute(2, loopCount);
    expect(route.coils).toHaveLength(loopCount);
    expect(route.loopWidth).toBeCloseTo(Math.min(0.5 / loopCount, 0.32));
    const samplesPerSection = (path.crossings[1].points.length - 1) / 7;
    const directions: BeeTurnDirection[] = [-1, 1];
    for (const [width, height] of [
      [1200, 800],
      [375, 500],
    ]) {
      const variedPath = createBeeFlightPath(width, height, route);
      for (const direction of directions) {
        expect(variedPath.crossings[direction].points).toHaveLength(
          (2 * loopCount + 3) * samplesPerSection + 1,
        );
        for (let sample = 0; sample <= 200; sample++) {
          const point = getBeePosition(sample / 200, variedPath, direction);
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
          expect(point.x).toBeGreaterThanOrEqual(24 + (width - 48) * 0.03 - 0.000001);
          expect(point.x).toBeLessThanOrEqual(width - 24 - (width - 48) * 0.03 + 0.000001);
          expect(point.y).toBeGreaterThanOrEqual(24 - 0.000001);
          expect(point.y).toBeLessThanOrEqual(height - 24 + 0.000001);
        }
      }
    }
  });

  it.each([0, -1, 1.5, NaN, Infinity])('rejects an invalid loop count: %s', (loopCount) => {
    expect(() => createBeeRoute(2, loopCount)).toThrow(
      'LOOPS_PER_CROSSING must be a positive integer',
    );
  });

  it('rejects an empty route instead of building invalid coordinates', () => {
    expect(() => createBeeFlightPath(1200, 800, { ...fixedRoute(2), coils: [] })).toThrow(
      'A bee route must contain at least one coil',
    );
  });

  it('reaches the right after one crossing and returns left after two', () => {
    const left = position(0);
    const right = position(0.5);
    expect(left.x).toBeCloseTo(24 + (1200 - 48) * 0.03);
    expect(right.x).toBeCloseTo(24 + (1200 - 48) * 0.97);
    expect(position(1)).toEqual(left);
    expect(left.y).toBe(400);
    expect(right.y).toBe(400);
  });

  it.each([0, 0.5, 1])('joins seamlessly, including a turn choice at progress %s', (boundary) => {
    const step = 0.000001;
    const end = getBeePosition(boundary, path, 1);
    const start = getBeePosition(boundary, path, -1);
    expect(start).toEqual(end);
    const before = getBeePosition(boundary - step, path, 1);
    const after = getBeePosition(boundary + step, path, -1);
    const incoming = Math.atan2(end.y - before.y, end.x - before.x);
    const outgoing = Math.atan2(after.y - start.y, after.x - start.x);
    expect(angleDifference(incoming, outgoing)).toBeLessThan(Math.PI / 180);
  });

  it.each([
    [1440, 724],
    [375, 500],
    [2560, 720],
    [48, 48],
    [20, 10],
    [0, 0],
  ])('keeps sizes 1 and 2 inside the below-header viewport at %i × %i', (width, height) => {
    for (const size of [1, 2]) {
      const sizedPath = createBeeFlightPath(width, height, fixedRoute(size));
      const insetX = Math.min(24, width / 2) + Math.max(0, width - 48) * 0.03;
      const insetY = Math.min(24, height / 2);
      const directions: BeeTurnDirection[] = [-1, 1];
      for (const direction of directions) {
        for (let sample = 0; sample <= 1000; sample++) {
          const point = getBeePosition(sample / 1000, sizedPath, direction);
          expect(point.x).toBeGreaterThanOrEqual(insetX - 0.000001);
          expect(point.x).toBeLessThanOrEqual(width - insetX + 0.000001);
          expect(point.y).toBeGreaterThanOrEqual(insetY - 0.000001);
          expect(point.y).toBeLessThanOrEqual(height - insetY + 0.000001);
        }
      }
    }
  });

  it.each([
    [1440, 724, 1],
    [1440, 724, 2],
    [375, 500, 1],
    [375, 500, 2],
    [2560, 720, 2],
  ])('keeps distance-based movement smooth at %i × %i, size %i', (width, height, size) => {
    const random = vi.spyOn(Math, 'random');
    // Path building draws random jitters, so sweep deterministic seeds across
    // the full jitter range instead of leaving this test to chance.
    for (const seed of [0, 0.25, 0.5, 0.75, 1]) {
      random.mockReturnValue(seed);
      const sizedPath = createBeeFlightPath(width, height, fixedRoute(size));
      const frames = 30 * 60;
      const directions: BeeTurnDirection[] = [-1, 1];
      let largestTurn = 0;
      for (const direction of directions) {
        const expectedStep = (sizedPath.crossings[direction].length * 2) / frames;
        let previous = getBeePosition(0, sizedPath, direction);
        let previousHeading: number | undefined;
        for (let frame = 1; frame <= frames; frame++) {
          const point = getBeePosition(frame / frames, sizedPath, direction);
          const dx = point.x - previous.x;
          const dy = point.y - previous.y;
          expect(Math.hypot(dx, dy) / expectedStep).toBeGreaterThan(0.99);
          expect(Math.hypot(dx, dy) / expectedStep).toBeLessThan(1.001);
          const heading = Math.atan2(dy, dx);
          if (previousHeading !== undefined) {
            largestTurn = Math.max(largestTurn, angleDifference(previousHeading, heading));
          }
          previous = point;
          previousHeading = heading;
        }
      }
      // Smaller screens run the same speed over tighter curves, so allow a
      // slightly higher per-frame rotation there.
      const maxTurn = width < 640 ? Math.PI / 12 : Math.PI / 18;
      expect(largestTurn).toBeLessThan(maxTurn);
    }
    random.mockRestore();
  });

  it('uses the top and bottom and visibly different loop sizes at 1200 × 800', () => {
    const width = 1200;
    const height = 800;
    const variedPath = createBeeFlightPath(width, height, fixedRoute(2));
    const points = variedPath.crossings[1].points;
    const ys = points.map((point) => point.y);
    expect(Math.min(...ys)).toBeLessThan(height * 0.15);
    expect(Math.max(...ys)).toBeGreaterThan(height * 0.85);
    // Seven sampled sections: edge, connector, coil, connector, coil, connector, edge.
    const section = (points.length - 1) / 7;
    const firstCoil = points.slice(section * 2, section * 3 + 1);
    const secondCoil = points.slice(section * 4, section * 5 + 1);
    function extent(coil: typeof points, axis: 'x' | 'y') {
      const coordinates = coil.map((point) => point[axis]);
      return Math.max(...coordinates) - Math.min(...coordinates);
    }
    expect(extent(secondCoil, 'x') / extent(firstCoil, 'x')).toBeGreaterThan(1.3);
    expect(extent(secondCoil, 'y') / extent(firstCoil, 'y')).toBeGreaterThan(1.3);
  });

  it('trades full-height extremes for gentle slopes on narrow screens', () => {
    // Narrow connectors cannot swing full-height without whipping the bee's
    // heading, so coils rise gradually; coverage spreads across the cycle
    // instead of jumping between the top and bottom in one connector.
    const variedPath = createBeeFlightPath(375, 500, fixedRoute(2));
    const points = variedPath.crossings[1].points;
    const ys = points.map((point) => point.y);
    // Coverage arrives gradually across chained coils rather than in one
    // full-height connector; a single crossing still spans a healthy share.
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(452 * 0.4);
  });

  it('creates fresh routes with upper/lower coverage and variation even at size 2', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);
    try {
      const first = createBeeRoute();
      const firstPath = createBeeFlightPath(1200, 800, first);
      random.mockReturnValue(0.9);
      const second = createBeeRoute();
      const secondPath = createBeeFlightPath(1200, 800, second);
      expect(first).not.toEqual(second);
      expect(first.coils[0].scale).not.toBe(first.coils[1].scale);
      expect(first.loopWidth).toBe(Math.min(0.5 / first.coils.length, 0.32));
      expect(first.loopHeight).toBe(0.18);
      expect(getBeePosition(0, firstPath)).toEqual(getBeePosition(0, secondPath));
      expect(getBeePosition(0.5, firstPath)).toEqual(getBeePosition(0.5, secondPath));
      expect(getBeePosition(0.2, firstPath)).not.toEqual(getBeePosition(0.2, secondPath));
    } finally {
      random.mockRestore();
    }
  });

  it('matches position, heading, and speed when switching to a different route', () => {
    const nextRoute = fixedRoute(1);
    nextRoute.coils.reverse();
    const nextPath = createBeeFlightPath(1200, 800, nextRoute);
    const length = path.crossings[1].length;
    const nextLength = nextPath.crossings[-1].length;
    // Equal pixel steps keep velocity constant even when route lengths differ.
    const step = 0.01;
    const beforeProgress = 1 - step / length;
    const afterProgress = step / nextLength;
    const before = getBeePosition(beforeProgress / 2, path, 1);
    const join = getBeePosition(0.5, path, 1);
    const after = getBeePosition((1 + afterProgress) / 2, nextPath, -1);
    const incoming = Math.hypot(join.x - before.x, join.y - before.y);
    const outgoing = Math.hypot(after.x - join.x, after.y - join.y);
    expect(outgoing / incoming).toBeCloseTo(1, 3);
    expect(
      angleDifference(
        Math.atan2(join.y - before.y, join.x - before.x),
        Math.atan2(after.y - join.y, after.x - join.x),
      ),
    ).toBeLessThan(Math.PI / 180);
  });
});

describe('bee trail', () => {
  it('fades each point by its own age and configurable lifetime', () => {
    expect(getTrailOpacity(0, 0, 30_000)).toBe(1);
    expect(getTrailOpacity(0, 15_000, 30_000)).toBe(0.5);
    expect(getTrailOpacity(10_000, 15_000, 30_000)).toBeCloseTo(5 / 6);
    expect(getTrailOpacity(0, 30_000, 30_000)).toBe(0);
    expect(getTrailOpacity(0, 45_000, 30_000)).toBe(0);
    expect(getTrailOpacity(0, 15_000, 60_000)).toBe(0.75);
  });

  it('discards expired samples without modifying the original array', () => {
    const points = [0, 10_000, 20_000, 30_000].map((time) => ({ x: 0, y: 0, time }));
    expect(pruneBeeTrail(points, 40_000, 30_000)).toEqual(points.slice(2));
    expect(pruneBeeTrail(points, 60_000, 30_000)).toEqual([]);
    expect(points).toHaveLength(4);
  });
});
