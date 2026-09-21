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
      const flight = requireFlight(
        createBeeTwoFlight(
          area,
          {
            ...settings,
            outerPaddingRatio,
            loopVariation: 0,
            travelIntensity: 0,
          },
          seededRandom(15),
        ),
      );
      let minimumX = Infinity;
      let minimumY = Infinity;
      for (let index = 0; index < 20000; index++) {
        const point = flight.advance(4);
        if (!isSafe(point, area, outerPaddingRatio))
          throw new Error('Bee escaped the padded border');
        minimumX = Math.min(minimumX, point.x);
        minimumY = Math.min(minimumY, point.y);
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
      // Allow enough flight distance to visit every edge while also wandering inward.
      for (let index = 0; index < 30000; index++) {
        const point = flight.advance(4);
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
      cumulativeTurn += turn;
      previous = point;
    }
    expect(maximumDistanceError).toBeLessThan(0.005);
    expect(maximumTurn).toBeLessThan(0.2);
    expect(Math.abs(cumulativeTurn)).toBeGreaterThan(20 * Math.PI * 2);
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
          seededRandom(72),
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
