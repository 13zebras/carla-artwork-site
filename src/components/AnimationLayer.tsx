import { type CSSProperties, useEffect, useState } from 'react';

interface Circle {
  id: number;
  size: number;
  top: number;
  left: number;
  hue: number;
  fadeIn: number;
  fadeOut: number;
  driftX: number;
  driftY: number;
}

interface Quadrant {
  top: [number, number];
  left: [number, number];
}

const SLOT_COUNT = 9;
const REMOVAL_BUFFER_MS = 500;
const MIN_SPAWN_GAP_MS = 2000;
const MAX_SPAWN_GAP_RANDOM_MS = 1500; // Random additional delay to avoid predictability

// Circle diameter as a percentage of viewport width:
// Mobile @ 400px: ~20-80px
// Desktop @ 1500px: ~75-300px
const MIN_CIRCLE_SIZE_VW = 10;
const MIN_CIRCLE_SIZE_PX = 50;
const MAX_CIRCLE_SIZE_VW = 30;
const MAX_CIRCLE_SIZE_PX = 350;

// Circles drift outward from the center while visible.
const DRIFT_DISTANCE_X_PX = 100;
const DRIFT_DISTANCE_Y_PX = 100;

type QuadrantBounds = {
  minLeft: number;
  maxLeft: number;
  minRight: number;
  maxRight: number;
};

function getQuadrantLeftRightBounds(): QuadrantBounds {
  const width = window.innerWidth;
  if (width < 640) return { minLeft: 5, maxLeft: 35, minRight: 65, maxRight: 95 };
  if (width < 1024) return { minLeft: 5, maxLeft: 40, minRight: 60, maxRight: 95 };
  if (width < 1440) return { minLeft: 10, maxLeft: 45, minRight: 55, maxRight: 90 };
  return { minLeft: 15, maxLeft: 45, minRight: 55, maxRight: 85 };
}

function getQuadrants(): Quadrant[] {
  const { minLeft, maxLeft, minRight, maxRight } = getQuadrantLeftRightBounds();
  return [
    { top: [0, 45], left: [minLeft, maxLeft] }, // top left
    { top: [55, 100], left: [minLeft, maxLeft] }, // bottom left
    { top: [0, 45], left: [minRight, maxRight] }, // top right
    { top: [55, 100], left: [minRight, maxRight] }, // bottom right
  ];
}

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

function createCircle(id: number, quadrant: Quadrant): Circle {
  const minCircleVWtoPX = (MIN_CIRCLE_SIZE_VW / 100) * window.innerWidth;
  const minCircleSize = minCircleVWtoPX > MIN_CIRCLE_SIZE_PX ? MIN_CIRCLE_SIZE_PX : minCircleVWtoPX;
  const maxCircleSize = Math.min(
    MAX_CIRCLE_SIZE_PX,
    (MAX_CIRCLE_SIZE_VW / 100) * window.innerWidth,
  );
  const circle = {
    id,
    size: randomBetween(minCircleSize, maxCircleSize),
    top: randomBetween(...quadrant.top),
    left: randomBetween(...quadrant.left),
    hue: randomBetween(0, 360),
    fadeIn: randomBetween(2000, 3000),
    fadeOut: randomBetween(4000, 7000),
    // Left quadrants drift left, right quadrants drift right.
    driftX:
      (quadrant.left[0] + quadrant.left[1]) / 2 < 50 ? -DRIFT_DISTANCE_X_PX : DRIFT_DISTANCE_X_PX,
    // Top quadrants drift down, bottom quadrants drift up.
    driftY:
      (quadrant.top[0] + quadrant.top[1]) / 2 < 50 ? DRIFT_DISTANCE_Y_PX : -DRIFT_DISTANCE_Y_PX,
  };

  return circle;
}

function CircleDot({ circle, grayscale }: { circle: Circle; grayscale: boolean }) {
  const filter = grayscale
    ? `hue-rotate(${circle.hue}deg) grayscale(1)`
    : `hue-rotate(${circle.hue}deg)`;

  const style = {
    '--top': `${circle.top}%`,
    '--left': `${circle.left}%`,
    '--fade-in': `${circle.fadeIn}ms`,
    '--fade-out': `${circle.fadeOut}ms`,
    '--drift-x': `${circle.driftX}px`,
    '--drift-y': `${circle.driftY}px`,
    width: `${circle.size}px`,
    height: `${circle.size}px`,
    filter,
  } as CSSProperties;

  return (
    <div
      className='animation-circle rounded-full bg-radial from-red-800 to-red-900 to-90%'
      style={style}
    />
  );
}

export function AnimationLayer({ grayscale = false }: { grayscale?: boolean }) {
  const [circles, setCircles] = useState<Circle[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const timeouts = new Set<number>();
    let nextId = 0;
    let quadrantIndex = 0;
    let nextSpawnAt = 0;

    const schedule = (callback: () => void, delay: number) => {
      const handle = window.setTimeout(() => {
        timeouts.delete(handle);
        callback();
      }, delay);
      timeouts.add(handle);
    };

    const spawnCircle = () => {
      const quadrants = getQuadrants();
      const circle = createCircle(nextId++, quadrants[quadrantIndex % quadrants.length]);
      quadrantIndex++;
      setCircles((current) => [...current, circle]);
      schedule(
        () => {
          setCircles((current) => current.filter((c) => c.id !== circle.id));
          requestSpawn(randomBetween(0, MAX_SPAWN_GAP_RANDOM_MS));
        },
        circle.fadeIn + circle.fadeOut + REMOVAL_BUFFER_MS,
      );
    };

    // Enforces a global minimum gap between spawns, so no two circles ever
    // appear at (nearly) the same time.
    const requestSpawn = (minDelay: number) => {
      const now = Date.now();
      const spawnAt = Math.max(now + minDelay, nextSpawnAt);
      nextSpawnAt = spawnAt + MIN_SPAWN_GAP_MS;
      schedule(spawnCircle, spawnAt - now);
    };

    for (let i = 0; i < SLOT_COUNT; i++) {
      if (i === 0) {
        requestSpawn(0);
      } else {
        requestSpawn(randomBetween(1, MAX_SPAWN_GAP_RANDOM_MS));
      }
    }

    return () => {
      for (const handle of timeouts) {
        window.clearTimeout(handle);
      }
      timeouts.clear();
    };
  }, []);

  return (
    <div
      aria-hidden='true'
      className='pointer-events-none fixed inset-x-0 bottom-0 top-44 z-0 overflow-hidden'
    >
      {circles.map((circle) => (
        <CircleDot key={circle.id} circle={circle} grayscale={grayscale} />
      ))}
    </div>
  );
}
