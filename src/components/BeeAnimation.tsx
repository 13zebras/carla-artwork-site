import { Bug } from 'lucide-react';
import { useEffect, useRef } from 'react';

import {
  createBeeFlightPath,
  createBeeRoute,
  getBeePosition,
  getTrailOpacity,
  pruneBeeTrail,
} from '@/lib/shared/bee-animation';
import type {
  BeeFlightPath,
  BeeRoute,
  BeeTrailPoint,
  BeeTurnDirection,
} from '@/lib/shared/bee-animation';
import { createBeeDistanceStepper } from '@/lib/shared/bee-velocity';

// CSS pixels per second, independent of viewport size and route length.
const VELOCITY_MIN = 90;
const VELOCITY_MAX = 170;
// Time spent gradually easing from one random velocity to the next.
const SPEED_TRANSITION_MIN_MS = 3_000;
const SPEED_TRANSITION_MAX_MS = 7_000;
const FADE_IN_MS = 1_000;
const TRAIL_LIFETIME_MS = 30_000;
const TRAIL_WIDTH_PX = 2;
const TRAIL_OPACITY = 0.35;

const TRAIL_SAMPLE_INTERVAL_MS = 1000 / 30;

function animateBee(
  viewport: HTMLDivElement,
  canvas: HTMLCanvasElement,
  bee: HTMLDivElement,
  route: BeeRoute,
) {
  const context = canvas.getContext('2d');
  if (!context) return;

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let currentRoute = route;
  let path: BeeFlightPath | undefined;
  let frameId: number | null = null;
  let previousFrameTime: number | null = null;
  let fadeElapsedMs = 0;
  let distanceTravelled = 0;
  let crossingIndex = 0;
  let turnDirection: BeeTurnDirection = Math.random() < 0.5 ? -1 : 1;
  const advanceDistance = createBeeDistanceStepper({
    minVelocity: VELOCITY_MIN,
    maxVelocity: VELOCITY_MAX,
    minTransitionMs: SPEED_TRANSITION_MIN_MS,
    maxTransitionMs: SPEED_TRANSITION_MAX_MS,
  });
  const header = viewport.parentElement?.querySelector<HTMLElement>('[data-site-header]');
  let trail: BeeTrailPoint[] = [];
  let lastSampleTime = -Infinity;

  function resize() {
    if (!context) return;
    if (header) {
      const headerBottom = Math.max(
        0,
        Math.min(window.innerHeight, header.getBoundingClientRect().bottom),
      );
      viewport.style.top = `${headerBottom}px`;
    }
    const bounds = viewport.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const previousLength = path?.crossings[turnDirection].length ?? 0;
    const progress = previousLength > 0 ? distanceTravelled / previousLength : 0;
    path = createBeeFlightPath(width, height, currentRoute);
    // Preserve progress on the resized route, without restarting its velocity.
    distanceTravelled = progress * path.crossings[turnDirection].length;
    pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    trail = [];
    lastSampleTime = -Infinity;
    // Avoid showing the old position between resize and the next frame.
    viewport.style.visibility = 'hidden';
  }

  function drawTrail(now: number, head: BeeTrailPoint) {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    // Read the inherited theme color so light/dark changes also recolor old trails.
    context.strokeStyle = getComputedStyle(viewport).color;
    context.lineWidth = TRAIL_WIDTH_PX;
    // Rounded caps extend beyond endpoints and double-blend adjacent segments.
    context.lineCap = 'butt';
    context.lineJoin = 'round';

    for (let index = 1; index <= trail.length; index++) {
      const start = trail[index - 1];
      const end = trail[index] ?? head;
      context.globalAlpha = TRAIL_OPACITY * getTrailOpacity(start.time, now, TRAIL_LIFETIME_MS);
      if (context.globalAlpha === 0) continue;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  function frame(now: number) {
    frameId = null;
    if (pixelRatio !== (window.devicePixelRatio || 1)) resize();
    if (!path) return;

    if (previousFrameTime !== null) {
      const deltaMs = now - previousFrameTime;
      distanceTravelled += advanceDistance(deltaMs);
      fadeElapsedMs = Math.min(FADE_IN_MS, fadeElapsedMs + deltaMs);
    }
    previousFrameTime = now;
    viewport.style.opacity = String(fadeElapsedMs / FADE_IN_MS);

    let length = path.crossings[turnDirection].length;
    while (length > 0 && distanceTravelled >= length) {
      // Shared edge tangents preserve heading; carry leftover distance and
      // keep the velocity transition running across routes of any length.
      distanceTravelled -= length;
      crossingIndex++;
      currentRoute = createBeeRoute();
      turnDirection = Math.random() < 0.5 ? -1 : 1;
      path = createBeeFlightPath(width, height, currentRoute);
      length = path.crossings[turnDirection].length;
    }
    // A collapsed viewport has no distance to travel; do not bank movement.
    if (length === 0) distanceTravelled = 0;
    const distanceProgress = length > 0 ? distanceTravelled / length : 0;
    const progress = ((crossingIndex % 2) + distanceProgress) / 2;
    const position = getBeePosition(progress, path, turnDirection);
    const next = getBeePosition(progress + 0.0001, path, turnDirection);
    // The placeholder Bug points up; add 90 degrees to align it with the tangent.
    const rotation = Math.atan2(next.y - position.y, next.x - position.x) + Math.PI / 2;
    bee.style.transform = `translate(${position.x}px, ${position.y}px) translate(-50%, -50%) rotate(${rotation}rad)`;
    viewport.style.visibility = 'visible';

    const head = { ...position, time: now };
    if (now - lastSampleTime >= TRAIL_SAMPLE_INTERVAL_MS) {
      trail = pruneBeeTrail(trail, now, TRAIL_LIFETIME_MS);
      trail.push(head);
      lastSampleTime = now;
    }
    drawTrail(now, head);
    frameId = requestAnimationFrame(frame);
  }

  function stopFrames() {
    if (frameId !== null) cancelAnimationFrame(frameId);
    frameId = null;
    previousFrameTime = null;
  }

  function handleVisibility() {
    stopFrames();
    if (document.hidden) return;
    // Trail timestamps use real elapsed time; flight time excludes hidden tabs.
    trail = pruneBeeTrail(trail, performance.now(), TRAIL_LIFETIME_MS);
    lastSampleTime = -Infinity;
    frameId = requestAnimationFrame(frame);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  if (header) observer.observe(header);
  resize();
  handleVisibility();
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    stopFrames();
    observer.disconnect();
    document.removeEventListener('visibilitychange', handleVisibility);
    context.clearRect(0, 0, width, height);
    viewport.style.visibility = 'hidden';
  };
}

export function BeeAnimation() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    const bee = beeRef.current;
    if (!viewport || !canvas || !bee) return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const route = createBeeRoute();
    let stopAnimation: (() => void) | undefined;

    const updateMotion = () => {
      stopAnimation?.();
      stopAnimation = undefined;
      if (preference.matches) return;
      stopAnimation = animateBee(viewport, canvas, bee, route);
    };

    preference.addEventListener('change', updateMotion);
    updateMotion();
    return () => {
      preference.removeEventListener('change', updateMotion);
      stopAnimation?.();
    };
  }, []);

  return (
    // Responsive top offsets are a pre-measurement fallback; the live header
    // bounds define the flight area. Isolation keeps this layer behind artwork.
    <div
      ref={viewportRef}
      aria-hidden='true'
      className='bee-animation pointer-events-none invisible opacity-0 fixed inset-x-0 bottom-0 top-44 xxs:top-42 xs:top-40 sm:top-42 xl:top-38 -z-10 overflow-hidden text-stone-700 dark:text-stone-400'
    >
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 size-full' />
      <div ref={beeRef} className='absolute top-0 left-0 size-3 will-change-transform'>
        <Bug className='size-full' />
      </div>
    </div>
  );
}
