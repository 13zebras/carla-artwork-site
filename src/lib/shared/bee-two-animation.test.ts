import { describe, expect, it } from 'vitest';

import {
  beeTwoEase,
  beeTwoTrailOpacity,
  createBeeTwoFlight,
  createBeeTwoSpeed,
  getBeeTwoArea,
} from '@/lib/shared/bee-two-animation';
import type { BeeTwoArea, BeeTwoPoint } from '@/lib/shared/bee-two-animation';

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const settings = {
  loopSizeRatio: 0.14,
  loopVariation: 0.35,
  outerPaddingRatio: 0.02,
  travelIntensity: 0.8,
  clearance: 10,
};

function requireFlight(flight: ReturnType<typeof createBeeTwoFlight>) {
  if (!flight) throw new Error('Expected a usable bee-two flight area');
  return flight;
}

function isSafe(point: BeeTwoPoint, area: BeeTwoArea, paddingRatio = settings.outerPaddingRatio) {
  const { clearance } = settings;
  const marginX = area.width * paddingRatio + clearance;
  const marginY = area.height * paddingRatio + clearance;
  const insideContainer =
    point.x >= marginX - 0.000001 &&
    point.x <= area.width - marginX + 0.000001 &&
    point.y >= marginY - 0.000001 &&
    point.y <= area.height - marginY + 0.000001;
  const outsideCenter =
    point.x + clearance <= area.width * 0.4 ||
    point.x - clearance >= area.width * 0.6 ||
    point.y + clearance <= area.height * 0.4 ||
    point.y - clearance >= area.height * 0.6;
  return insideContainer && outsideCenter;
}

describe('bee-two container geometry', () => {
  it('uses the full viewport only when requested', () => {
    expect(getBeeTwoArea(1200, 900, 180, true)).toEqual({ width: 1200, height: 900, top: 0 });
  });

  it('both shifts and shrinks the central rectangle when excluding the header', () => {
    const area = getBeeTwoArea(1200, 900, 180, false);
    expect(area).toEqual({ width: 1200, height: 720, top: 180 });
    expect(area.width * 0.4).toBe(480);
    expect(area.width * 0.6).toBe(720);
    expect(area.top + area.height * 0.4).toBe(468);
    expect(area.top + area.height * 0.6).toBe(612);
  });

  it.each([
    [1440, 1000, 152, true],
    [1440, 1000, 152, false],
    [390, 844, 176, true],
    [390, 844, 176, false],
    [844, 390, 176, false],
    [280, 440, 176, false],
  ] as const)(
    'keeps loops and their joins inside %s×%s (header=%s, full=%s)',
    (w, h, header, full) => {
      const area = getBeeTwoArea(w, h, header, full);
      const flight = requireFlight(createBeeTwoFlight(area, settings, seededRandom(97)));
      const visited = { top: false, right: false, bottom: false, left: false };
      // Enough distance for multiple circuits, including all rounded corners and joins.
      for (let index = 0; index < 20000; index++) {
        const point = flight.advance(4);
        if (!isSafe(point, area))
          throw new Error(`Unsafe bee-two position: ${JSON.stringify(point)}`);
        if (point.y < area.height * 0.4) visited.top = true;
        if (point.x > area.width * 0.6) visited.right = true;
        if (point.y > area.height * 0.6) visited.bottom = true;
        if (point.x < area.width * 0.4) visited.left = true;
      }
      expect(Object.values(visited).every(Boolean)).toBe(true);
    },
  );

  it.each([-0.15, -0.05, 0, 0.02, 0.08, 0.15, 0.25])(
    'honors an adjustable outer margin of %s',
    (outerPaddingRatio) => {
      const area = getBeeTwoArea(1200, 800, 160, false);
      let minimumX = Infinity;
      let minimumY = Infinity;
      // Start at a horizontal and a vertical edge. Frequent reversals no longer
      // guarantee a full perimeter lap when travel intensity is zero.
      for (const randomValue of [0.125, 0.875]) {
        const flight = requireFlight(
          createBeeTwoFlight(
            area,
            {
              ...settings,
              outerPaddingRatio,
              loopVariation: 0,
              travelIntensity: 0,
            },
            () => randomValue,
          ),
        );
        for (let index = 0; index < 20000; index++) {
          const point = flight.advance(4);
          if (!isSafe(point, area, outerPaddingRatio))
            throw new Error('Bee escaped the padded border');
          minimumX = Math.min(minimumX, point.x);
          minimumY = Math.min(minimumY, point.y);
        }
      }
      // This checks actual proximity, not just containment: reducing padding really
      // moves loops outward instead of merely changing an unused boundary.
      expect(minimumX).toBeCloseTo(area.width * outerPaddingRatio + settings.clearance, 1);
      expect(minimumY).toBeCloseTo(area.height * outerPaddingRatio + settings.clearance, 1);
    },
  );

  it.each([
    [1200, 800, 160, true, 0.14],
    [1200, 800, 160, false, 1],
    [390, 844, 176, false, 1],
  ] as const)(
    'allows exits and re-entry without crossing the center (%s×%s, header=%s, full=%s, loops=%s)',
    (width, height, header, full, loopSizeRatio) => {
      const area = getBeeTwoArea(width, height, header, full);
      const outerPaddingRatio = -0.08;
      const flight = requireFlight(
        createBeeTwoFlight(
          area,
          {
            ...settings,
            loopSizeRatio,
            outerPaddingRatio,
          },
          seededRandom(28),
        ),
      );
      const exited = { left: false, right: false, top: false, bottom: false };
      let wasOutside = false;
      let reentered = false;
      // Exercise exploration with an active clock at 100px/s, as the component
      // does. Distance-only geometry sampling deliberately leaves its clock paused.
      for (let index = 0; index < 60000; index++) {
        const point = flight.advance(4, 0.04);
        if (!isSafe(point, area, outerPaddingRatio))
          throw new Error('Bee crossed the center or extended flight boundary');
        if (point.x + settings.clearance < 0) exited.left = true;
        if (point.x - settings.clearance > area.width) exited.right = true;
        if (point.y + settings.clearance < 0) exited.top = true;
        if (point.y - settings.clearance > area.height) exited.bottom = true;
        const outside = point.x < 0 || point.x > area.width || point.y < 0 || point.y > area.height;
        if (wasOutside && !outside) reentered = true;
        wasOutside = outside;
      }
      expect(Object.values(exited).every(Boolean)).toBe(true);
      expect(reentered).toBe(true);
    },
  );

  it.each([true, false])('uses the newly opened inner band (full viewport=%s)', (fullViewport) => {
    const area = getBeeTwoArea(1000, 900, 160, fullViewport);
    const flight = requireFlight(
      createBeeTwoFlight(
        area,
        {
          ...settings,
          travelIntensity: 1,
        },
        seededRandom(43),
      ),
    );
    let enteredFormerExclusion = false;
    for (let index = 0; index < 20000; index++) {
      const point = flight.advance(4);
      if (!isSafe(point, area)) throw new Error('Bee entered the new 40–60% exclusion');
      // Prove it can enter space that was forbidden by the previous 33–66% rectangle.
      if (
        point.x > area.width * 0.33 &&
        point.x < area.width * 0.66 &&
        point.y > area.height * 0.33 &&
        point.y < area.height * 0.66
      ) {
        enteredFormerExclusion = true;
      }
    }
    expect(enteredFormerExclusion).toBe(true);
  });

  it.each([
    [1000, 800, 1.3, -0.1],
    [390, 844, 1.3, -0.1],
    [844, 390, 0.14, 0.02],
    [280, 440, 5, 0],
  ])(
    'visits the whole area with no central exclusion (%s×%s, loops=%s, padding=%s)',
    (width, height, loopSizeRatio, outerPaddingRatio) => {
      const area = getBeeTwoArea(width, height, 160, true);
      const flight = requireFlight(
        createBeeTwoFlight(
          area,
          {
            ...settings,
            loopSizeRatio,
            outerPaddingRatio,
            excludeCenter: false,
          },
          seededRandom(43),
        ),
      );
      const marginX = width * outerPaddingRatio + settings.clearance;
      const marginY = height * outerPaddingRatio + settings.clearance;
      const visited = new Set<string>();
      let travelledThroughCenter = false;
      // Sample more circuits now that loop entries vary between inward- and
      // outward-facing offsets, rather than always favoring the same side.
      for (let index = 0; index < 60000; index++) {
        const point = flight.advance(4);
        if (
          point.x < marginX - 0.000001 ||
          point.x > width - marginX + 0.000001 ||
          point.y < marginY - 0.000001 ||
          point.y > height - marginY + 0.000001
        ) {
          throw new Error('Unrestricted bee escaped the configured outer bounds');
        }
        if (point.x >= 0 && point.x < width && point.y >= 0 && point.y < height) {
          visited.add(`${Math.floor((point.x / width) * 3)},${Math.floor((point.y / height) * 3)}`);
        }
        if (
          point.phase === 'travel' &&
          point.x > width * 0.45 &&
          point.x < width * 0.55 &&
          point.y > height * 0.45 &&
          point.y < height * 0.55
        )
          travelledThroughCenter = true;
      }
      expect(visited.size).toBe(9);
      expect(travelledThroughCenter).toBe(true);
    },
  );

  it('declines padding that leaves no room for loops', () => {
    const area = getBeeTwoArea(1200, 800, 160, false);
    expect(createBeeTwoFlight(area, { ...settings, outerPaddingRatio: 0.4 })).toBeNull();
  });

  it('fits oversized loops and declines unusably small containers', () => {
    const area = getBeeTwoArea(390, 844, 176, false);
    const flight = requireFlight(
      createBeeTwoFlight(area, { ...settings, loopSizeRatio: 5 }, seededRandom(12)),
    );
    for (let index = 0; index < 10000; index++) {
      if (!isSafe(flight.advance(4), area)) throw new Error('Oversized loop escaped the border');
    }
    expect(createBeeTwoFlight(getBeeTwoArea(30, 30, 0, true), settings)).toBeNull();
    expect(createBeeTwoFlight(getBeeTwoArea(390, 100, 176, false), settings)).toBeNull();
  });
});

describe('bee-two looping motion', () => {
  const area = getBeeTwoArea(1000, 900, 160, false);

  it('travels by distance, loops repeatedly, and preserves smooth tangents through joins', () => {
    const flight = requireFlight(createBeeTwoFlight(area, settings, seededRandom(21)));
    let previous = flight.advance(0);
    let maximumDistanceError = 0;
    let maximumTurn = 0;
    let cumulativeTurn = 0;
    for (let index = 0; index < 40000; index++) {
      const point = flight.advance(0.5);
      const travelled = Math.hypot(point.x - previous.x, point.y - previous.y);
      const turn = Math.atan2(
        Math.sin(point.angle - previous.angle),
        Math.cos(point.angle - previous.angle),
      );
      maximumDistanceError = Math.max(maximumDistanceError, Math.abs(travelled - 0.5));
      maximumTurn = Math.max(maximumTurn, Math.abs(turn));
      cumulativeTurn += Math.abs(turn);
      previous = point;
    }
    expect(maximumDistanceError).toBeLessThan(0.005);
    expect(maximumTurn).toBeLessThan(0.2);
    expect(cumulativeTurn).toBeGreaterThan(20 * Math.PI * 2);
  });

  it.each([true, false])(
    'makes both left and right single loops in one continuous flight (exclude center=%s)',
    (excludeCenter) => {
      const flight = requireFlight(
        createBeeTwoFlight(
          area,
          {
            ...settings,
            loopSizeRatio: 0.15,
            loopVariation: 1.6,
            outerPaddingRatio: -0.1,
            loopSpacingRatio: 0.75,
            excludeCenter,
          },
          seededRandom(21),
        ),
      );
      let previous = flight.advance(0);
      let loopTurn = 0;
      let leftLoops = 0;
      let rightLoops = 0;
      const completedLoops: number[] = [];
      let maximumTurn = 0;
      let maximumDistanceError = 0;
      for (let index = 0; index < 60000; index++) {
        const point = flight.advance(0.5);
        const turn = Math.atan2(
          Math.sin(point.angle - previous.angle),
          Math.cos(point.angle - previous.angle),
        );
        maximumTurn = Math.max(maximumTurn, Math.abs(turn));
        maximumDistanceError = Math.max(
          maximumDistanceError,
          Math.abs(Math.hypot(point.x - previous.x, point.y - previous.y) - 0.5),
        );
        if (previous.phase === 'loop') {
          loopTurn += turn;
          if (point.phase === 'travel') {
            const revolutions = Math.round(loopTurn / (2 * Math.PI));
            completedLoops.push(revolutions);
            if (revolutions < 0) leftLoops++;
            if (revolutions > 0) rightLoops++;
            loopTurn = 0;
          }
        }
        if (excludeCenter && !isSafe(point, area, -0.1))
          throw new Error('Direction change entered excluded space');
        previous = point;
      }
      expect(leftLoops).toBeGreaterThan(5);
      expect(rightLoops).toBeGreaterThan(5);
      expect(completedLoops.every((turns) => Math.abs(turns) === 1)).toBe(true);
      expect(maximumTurn).toBeLessThan(0.2);
      expect(maximumDistanceError).toBeLessThan(0.005);
    },
  );

  it.each([
    [true, 21],
    [true, 43],
    [true, 91],
    [false, 21],
    [false, 43],
    [false, 91],
  ] as const)(
    'reverses travel after at most two loops, even when a turn needs more room (exclude center=%s, seed=%s)',
    (excludeCenter, seed) => {
      const viewport = getBeeTwoArea(1440, 900, 0, true);
      const flight = requireFlight(
        createBeeTwoFlight(
          viewport,
          {
            ...settings,
            loopSizeRatio: 0.15,
            loopVariation: 1.6,
            outerPaddingRatio: -0.1,
            loopSpacingRatio: 0.75,
            excludeCenter,
          },
          seededRandom(seed),
        ),
      );
      let previous = flight.advance(0);
      let loops = 0;
      let lastDirection = 0;
      let run = 0;
      let longestRun = 0;
      let directionChanges = 0;
      for (let index = 0; index < 60000 && loops < 12; index++) {
        const point = flight.advance(0.5);
        if (previous.phase === 'travel' && point.phase === 'loop') {
          // At entry, the heading still matches the guide, before orbital spin
          // takes over. Measure actual circulation, not the random candidate.
          const direction = Math.sign(
            (point.x - viewport.width / 2) * Math.sin(point.angle) -
              (point.y - viewport.height / 2) * Math.cos(point.angle),
          );
          if (lastDirection !== 0 && direction !== lastDirection) directionChanges++;
          run = direction === lastDirection ? run + 1 : 1;
          longestRun = Math.max(longestRun, run);
          lastDirection = direction;
          loops++;
        }
        previous = point;
      }
      expect(loops).toBe(12);
      expect(directionChanges).toBeGreaterThanOrEqual(5);
      // Finding room for a turn must not add a third loop in the same direction.
      expect(longestRun).toBeLessThanOrEqual(2);
    },
  );

  it.each([0.35, 1])(
    'keeps unrestricted travel and loop joins smooth (spacing=%s)',
    (loopSpacingRatio) => {
      const flight = requireFlight(
        createBeeTwoFlight(
          area,
          {
            ...settings,
            loopSizeRatio: 1.3,
            outerPaddingRatio: -0.1,
            excludeCenter: false,
            loopSpacingRatio,
          },
          seededRandom(91),
        ),
      );
      let previous = flight.advance(0);
      let maximumDistanceError = 0;
      let maximumTurn = 0;
      const phases = new Set<string>();
      for (let index = 0; index < 40000; index++) {
        const point = flight.advance(0.5);
        maximumDistanceError = Math.max(
          maximumDistanceError,
          Math.abs(Math.hypot(point.x - previous.x, point.y - previous.y) - 0.5),
        );
        maximumTurn = Math.max(
          maximumTurn,
          Math.abs(
            Math.atan2(
              Math.sin(point.angle - previous.angle),
              Math.cos(point.angle - previous.angle),
            ),
          ),
        );
        phases.add(point.phase);
        previous = point;
      }
      expect(phases.size).toBe(2);
      expect(maximumDistanceError).toBeLessThan(0.005);
      expect(maximumTurn).toBeLessThan(0.2);
    },
  );

  it.each([true, false])(
    'keeps one revolution per stop with shorter spacing (exclude center=%s)',
    (excludeCenter) => {
      function measureFirstLoop(loopSpacingRatio: number) {
        const flight = requireFlight(
          createBeeTwoFlight(
            area,
            {
              ...settings,
              loopSpacingRatio,
              excludeCenter,
            },
            seededRandom(21),
          ),
        );
        let previous = flight.advance(0);
        let turning = 0;
        let enteredLoop = false;
        for (let index = 0; index < 20000; index++) {
          const point = flight.advance(0.5);
          if (excludeCenter && !isSafe(point, area)) throw new Error('Loop entered the exclusion');
          if (previous.phase === 'loop') {
            turning += Math.atan2(
              Math.sin(point.angle - previous.angle),
              Math.cos(point.angle - previous.angle),
            );
            if (point.phase === 'travel') return Math.round(Math.abs(turning) / (2 * Math.PI));
          }
          if (point.phase === 'loop') enteredLoop = true;
          previous = point;
        }
        throw new Error(`Loop did not complete (entered=${enteredLoop})`);
      }
      expect(measureFirstLoop(1)).toBe(1);
      expect(measureFirstLoop(0.35)).toBe(1);
    },
  );

  it.each([
    [1440, 900],
    [1000, 800],
    [390, 844],
  ])('shortens the interval between distinct loops at unchanged speed (%s×%s)', (width, height) => {
    function countLoopStops(loopSpacingRatio: number) {
      let stops = 0;
      let crossedCenter = false;
      for (const seed of [21, 43, 91]) {
        const flight = requireFlight(
          createBeeTwoFlight(
            getBeeTwoArea(width, height, 0, true),
            {
              ...settings,
              loopSizeRatio: 0.1,
              loopVariation: 1.5,
              outerPaddingRatio: -0.1,
              excludeCenter: false,
              loopSpacingRatio,
            },
            seededRandom(seed),
          ),
        );
        let previous = flight.advance(0);
        // Equal travelled distance means equal time at the same speed. Sample
        // more trips now that reversals happen after at most two loops.
        for (let index = 0; index < 50000; index++) {
          const point = flight.advance(4);
          if (previous.phase === 'travel' && point.phase === 'loop') stops++;
          if (
            point.x > width * 0.4 &&
            point.x < width * 0.6 &&
            point.y > height * 0.4 &&
            point.y < height * 0.6
          )
            crossedCenter = true;
          previous = point;
        }
      }
      return { stops, crossedCenter };
    }
    const original = countLoopStops(1);
    const closer = countLoopStops(0.35);
    const intervalRatio = original.stops / closer.stops;
    // Approximately 7 seconds -> 5 seconds, rather than more turns at one stop.
    expect(intervalRatio).toBeGreaterThan(0.6);
    expect(intervalRatio).toBeLessThan(0.8);
    expect(closer.crossedCenter).toBe(true);
  });

  it('travels inward and outward between distinct loops', () => {
    const flight = requireFlight(
      createBeeTwoFlight(
        area,
        {
          ...settings,
          loopSizeRatio: 1.3,
          outerPaddingRatio: -0.1,
          travelIntensity: 1,
        },
        seededRandom(43),
      ),
    );
    let previous = flight.advance(0);
    let inward = false;
    let outward = false;
    let travelToLoop = 0;
    let loopToTravel = 0;
    for (let index = 0; index < 30000; index++) {
      const point = flight.advance(2);
      if (previous.phase === 'travel' && point.phase === 'loop') travelToLoop++;
      if (previous.phase === 'loop' && point.phase === 'travel') loopToTravel++;
      // Check travel alone in the straight top strip, excluding orbital motion/corners.
      if (
        previous.phase === 'travel' &&
        point.phase === 'travel' &&
        previous.x > area.width * 0.4 &&
        previous.x < area.width * 0.6 &&
        point.x > area.width * 0.4 &&
        point.x < area.width * 0.6 &&
        previous.y < area.height * 0.4 &&
        point.y < area.height * 0.4
      ) {
        if (point.y - previous.y > 0.5) inward = true;
        if (previous.y - point.y > 0.5) outward = true;
      }
      if (!isSafe(point, area, -0.1)) throw new Error('Travelling bee entered excluded space');
      previous = point;
    }
    expect(inward && outward).toBe(true);
    expect(travelToLoop).toBeGreaterThan(20);
    expect(Math.abs(travelToLoop - loopToTravel)).toBeLessThanOrEqual(1);
  });

  it('increases the distance travelled between loops with travel intensity', () => {
    function firstTravelDistance(travelIntensity: number) {
      const flight = requireFlight(
        createBeeTwoFlight(
          area,
          { ...settings, travelIntensity, loopVariation: 0 },
          // Hold random choices fixed to compare travel intensity alone.
          () => 0.4,
        ),
      );
      let distance = 0;
      while (distance < 5000 && flight.advance(1).phase === 'travel') distance++;
      return distance;
    }
    const minimal = firstTravelDistance(0);
    const strong = firstTravelDistance(1);
    expect(strong).toBeGreaterThan(minimal * 3);
    expect(strong).toBeLessThan(5000);
  });

  it('responds to loop size and randomness, while remaining reproducible for tests', () => {
    const regular = requireFlight(createBeeTwoFlight(area, settings, seededRandom(8)));
    const repeated = requireFlight(createBeeTwoFlight(area, settings, seededRandom(8)));
    const smaller = requireFlight(
      createBeeTwoFlight(area, { ...settings, loopSizeRatio: 0.06 }, seededRandom(8)),
    );
    const varied = requireFlight(
      createBeeTwoFlight(area, { ...settings, loopVariation: 0 }, seededRandom(8)),
    );
    const sample = regular.advance(1300);
    expect(repeated.advance(1300)).toEqual(sample);
    expect(smaller.advance(1300)).not.toEqual(sample);
    expect(varied.advance(1300)).not.toEqual(sample);
  });
});

describe('bee-two quadrant exploration', () => {
  function quadrantAt(point: BeeTwoPoint, area: BeeTwoArea) {
    return Number(point.x >= area.width / 2) + 2 * Number(point.y >= area.height / 2);
  }

  it('uses the configured time limit and skips local loops until another quadrant is reached', () => {
    const area = getBeeTwoArea(1000, 900, 160, false);
    function firstLoopAfterWaiting(maxQuadrantSeconds: number) {
      const flight = requireFlight(
        createBeeTwoFlight(
          area,
          {
            ...settings,
            travelIntensity: 0,
            maxQuadrantSeconds,
          },
          seededRandom(21),
        ),
      );
      const initialQuadrant = quadrantAt(flight.advance(0), area);
      flight.advance(0, 16);
      for (let index = 0; index < 20000; index++) {
        const point = flight.advance(1);
        if (point.phase === 'loop')
          return { initialQuadrant, loopQuadrant: quadrantAt(point, area) };
      }
      throw new Error('No loop reached after the quadrant wait');
    }
    const withinLimit = firstLoopAfterWaiting(30);
    const overdue = firstLoopAfterWaiting(15);
    expect(withinLimit.loopQuadrant).toBe(withinLimit.initialQuadrant);
    expect(overdue.loopQuadrant).not.toBe(overdue.initialQuadrant);
  });

  it.each([
    [1440, 900, false, 21],
    [1440, 900, false, 43],
    [1440, 900, false, 91],
    [1440, 900, true, 21],
    [1440, 900, true, 43],
    [1440, 900, true, 91],
    [390, 844, false, 21],
    [390, 844, false, 43],
    [390, 844, false, 91],
    [390, 844, true, 21],
    [390, 844, true, 43],
    [390, 844, true, 91],
    [844, 390, false, 21],
    [844, 390, false, 43],
    [844, 390, false, 91],
    [844, 390, true, 21],
    [844, 390, true, 43],
    [844, 390, true, 91],
  ] as const)(
    'draws loops in all four quadrants within five minutes (%s×%s, exclude center=%s, seed=%s)',
    (width, height, excludeCenter, seed) => {
      const area = getBeeTwoArea(width, height, 0, true);
      const flight = requireFlight(
        createBeeTwoFlight(
          area,
          {
            ...settings,
            loopSizeRatio: 0.2,
            loopVariation: 1.9,
            outerPaddingRatio: -0.1,
            loopSpacingRatio: 0.75,
            maxQuadrantSeconds: 15,
            excludeCenter,
          },
          seededRandom(seed),
        ),
      );
      let previous = flight.advance(0);
      let previousQuadrant = quadrantAt(previous, area);
      let residence = 0;
      let longestResidence = 0;
      let heldHeadingDistance = 0;
      let longestHeldHeading = 0;
      let maximumTurn = 0;
      let maximumDistanceError = 0;
      const loops = [0, 0, 0, 0];
      // Five minutes at 50px/s, the current minimum speed. Count actual loop
      // entries, not just brief crossings or a much longer distance-only run.
      for (let index = 0; index < 30000; index++) {
        const point = flight.advance(0.5, 0.01);
        const quadrant = quadrantAt(point, area);
        if (previous.phase === 'travel' && point.phase === 'loop') loops[quadrant]++;
        residence = quadrant === previousQuadrant ? residence + 0.01 : 0;
        longestResidence = Math.max(longestResidence, residence);
        const turn = Math.atan2(
          Math.sin(point.angle - previous.angle),
          Math.cos(point.angle - previous.angle),
        );
        maximumTurn = Math.max(maximumTurn, Math.abs(turn));
        // Verify accepted motion, not merely proposed turns: a new, non-axis
        // heading must actually be held for a stretch of travel.
        const held =
          previous.phase === 'travel' &&
          point.phase === 'travel' &&
          Math.abs(turn) < 1e-6 &&
          Math.abs(Math.sin(point.angle * 2)) > 0.12;
        heldHeadingDistance = held ? heldHeadingDistance + 0.5 : 0;
        longestHeldHeading = Math.max(longestHeldHeading, heldHeadingDistance);
        maximumDistanceError = Math.max(
          maximumDistanceError,
          Math.abs(Math.hypot(point.x - previous.x, point.y - previous.y) - 0.5),
        );
        if (excludeCenter && !isSafe(point, area, -0.1))
          throw new Error('Relocation crossed the center exclusion');
        const marginX = -width * 0.1 + settings.clearance;
        const marginY = -height * 0.1 + settings.clearance;
        if (
          point.x < marginX - 0.000001 ||
          point.x > width - marginX + 0.000001 ||
          point.y < marginY - 0.000001 ||
          point.y > height - marginY + 0.000001
        )
          throw new Error('Relocation escaped the outer padding');
        previousQuadrant = quadrant;
        previous = point;
      }
      expect(loops.every((count) => count > 0)).toBe(true);
      // The timer requests departure after 15s; finishing a curve and safely
      // reaching the next quadrant adds travel time, but must not take minutes.
      expect(longestResidence).toBeLessThan(60);
      expect(longestHeldHeading).toBeGreaterThan(5);
      expect(maximumTurn).toBeLessThan(0.2);
      expect(maximumDistanceError).toBeLessThan(0.005);
    },
  );
});

describe('bee-two speed and fading', () => {
  it('accelerates and decelerates smoothly without leaving speed limits', () => {
    const speed = createBeeTwoSpeed(24, 80, 1.5, 4.5, seededRandom(35));
    let previous = speed.advance(0);
    let increased = false;
    let decreased = false;
    for (let index = 0; index < 12000; index++) {
      const current = speed.advance(1 / 120);
      expect(current).toBeGreaterThanOrEqual(24);
      expect(current).toBeLessThanOrEqual(80);
      expect(Math.abs(current - previous)).toBeLessThan(0.6);
      if (current > previous) increased = true;
      if (current < previous) decreased = true;
      previous = current;
    }
    expect(increased && decreased).toBe(true);
  });

  it('is time based rather than frame based, and supports a fixed speed', () => {
    const smallSteps = createBeeTwoSpeed(24, 80, 1.5, 4.5, seededRandom(8));
    const largeStep = createBeeTwoSpeed(24, 80, 1.5, 4.5, seededRandom(8));
    for (let index = 0; index < 1200; index++) smallSteps.advance(1 / 120);
    expect(smallSteps.advance(0)).toBeCloseTo(largeStep.advance(10), 8);
    expect(createBeeTwoSpeed(40, 40, 1, 2).advance(100)).toBe(40);
  });

  it('fades each trail segment according to its own age over exactly 20 seconds', () => {
    expect(beeTwoTrailOpacity(0, 20)).toBe(1);
    expect(beeTwoTrailOpacity(5, 20)).toBe(0.75);
    expect(beeTwoTrailOpacity(10, 20)).toBe(0.5);
    expect(beeTwoTrailOpacity(19.99, 20)).toBeGreaterThan(0);
    expect(beeTwoTrailOpacity(20, 20)).toBe(0);
    expect(beeTwoTrailOpacity(50, 20)).toBe(0);
    expect([0, 0.5, 1, 2].map(beeTwoEase)).toEqual([0, 0.5, 1, 1]);
  });
});
