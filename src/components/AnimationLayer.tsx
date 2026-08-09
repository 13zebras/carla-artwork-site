import { type CSSProperties, useEffect, useState } from 'react';

interface Circle {
  id: number;
  size: number;
  top: number;
  left: number;
  hue: number;
  fadeIn: number;
  fadeOut: number;
}

interface Quadrant {
  top: [number, number];
  left: [number, number];
}

const SLOT_COUNT = 6;
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

// Circles rotate through the quadrants in this order. The middle band is
// left empty to reduce overlaps. The band width depends on viewport width:
// <640px: 20-80%, <1024px: 30-70%, otherwise 40-60%.
function getQuadrantLeftRightBounds(): [maxLeft: number, minRight: number] {
  const width = window.innerWidth;
  if (width < 640) return [15, 85];
  if (width < 1024) return [25, 75];
  return [35, 65];
}

function getQuadrants(): Quadrant[] {
  const [maxLeft, minRight] = getQuadrantLeftRightBounds();
  return [
    { top: [0, 40], left: [0, maxLeft] }, // top left
    { top: [50, 100], left: [0, maxLeft] }, // bottom left
    { top: [0, 40], left: [minRight, 100] }, // top right
    { top: [50, 100], left: [minRight, 100] }, // bottom right
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
  };

  return circle;
}

function CircleDot({ circle }: { circle: Circle }) {
  const style = {
    '--top': `${circle.top}%`,
    '--left': `${circle.left}%`,
    '--fade-in': `${circle.fadeIn}ms`,
    '--fade-out': `${circle.fadeOut}ms`,
    width: `${circle.size}px`,
    height: `${circle.size}px`,
    filter: `hue-rotate(${circle.hue}deg)`,
  } as CSSProperties;

  return (
    <div
      className='animation-circle rounded-full bg-radial from-red-800 to-red-900 to-90%'
      style={style}
    />
  );
}

export function AnimationLayer() {
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
      requestSpawn(randomBetween(0, MAX_SPAWN_GAP_RANDOM_MS));
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
      className='pointer-events-none fixed inset-x-0 bottom-0 top-44 z-0 overflow-hidden max-w-[120rem] mx-auto'
    >
      {circles.map((circle) => (
        <CircleDot key={circle.id} circle={circle} />
      ))}
    </div>
  );
}
