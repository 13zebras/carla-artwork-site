import { Bug } from 'lucide-react';
import { useEffect, useRef } from 'react';

import {
  beeTwoEase,
  beeTwoTrailOpacity,
  createBeeTwoFlight,
  createBeeTwoSpeed,
  getBeeTwoArea,
} from '@/lib/shared/bee-two-animation';
import type { BeeTwoPoint } from '@/lib/shared/bee-two-animation';

// Above-content mode removes the central exclusion and always uses the full viewport.
// FULL_VIEWPORT controls header exclusion only when flying behind the content.
const ABOVE_CONTENT = true;
const FULL_VIEWPORT = true;

// Outer margin relative to container width/height: 0.02 = 2% inward; 0 = no extra gap.
// Negative values (try -0.03) let loops extend past the edges and disappear/reappear.
// Icon clearance offsets this margin; smaller random loops may not reach its limit.
const OUTER_PADDING_RATIO = -0.08;

// 0 = minimal connectors; 1 = full inward/outward wandering and longer travel.
// Higher intensity reserves more of the border for travel by fitting loops smaller.
const TRAVEL_INTENSITY = 0.8;

// Distance between single-loop stops: 1 = original spacing; lower = more frequent loops.
// This shortens travel without changing speed, loop size, or inward/outward range.
const LOOP_SPACING_RATIO = 0.75;

// Active seconds spent in a quadrant before moving to a less-recently visited one.
// Finish the current curve, then travel without local loops until arrival.
const MAX_QUADRANT_SECONDS = 12;

// Degrees for each of the two gradual, randomly left/right quadrant-travel turns.
const MIN_TURN = 20;
const MAX_TURN = 45;

// Base loop diameter / smaller CONTAINER dimension. Large values are fitted to the border.
const LOOP_SIZE_RATIO = 0.15;
const LOOP_SIZE_VARIATION = 2.0;
const MIN_SPEED_PX_PER_SECOND = 50;
const MAX_SPEED_PX_PER_SECOND = 200;
const MIN_SPEED_CHANGE_SECONDS = 30;
const MAX_SPEED_CHANGE_SECONDS = 70;
const FADE_IN_SECONDS = 6;
const TRAIL_LIFETIME_SECONDS = 20;
const TRAIL_SAMPLES_PER_SECOND = 30;
const TRAIL_OPACITY = 0.35;
const TRAIL_WIDTH = 2;
const MAX_TRAIL_SAMPLES = Math.ceil(TRAIL_LIFETIME_SECONDS * TRAIL_SAMPLES_PER_SECOND) + 2;

// Optional overrides also let tests exercise all four switch combinations.
type BeeTwoAnimationProps = { aboveContent?: boolean; fullViewport?: boolean };
type TrailPoint = BeeTwoPoint & { created: number; opacity: number };

export function BeeTwoAnimation({
  aboveContent = ABOVE_CONTENT,
  fullViewport = FULL_VIEWPORT,
}: BeeTwoAnimationProps = {}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beeRef = useRef<HTMLDivElement>(null);
  const usesFullViewport = aboveContent || fullViewport;
  const topClasses = usesFullViewport ? 'top-0' : 'top-44 xxs:top-42 xs:top-40 sm:top-42 xl:top-38';
  const layerClass = aboveContent ? 'z-30' : '-z-10';

  useEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    const bee = beeRef.current;
    if (!viewport || !canvas || !bee) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const header = document.querySelector<HTMLElement>('[data-site-header]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const speed = createBeeTwoSpeed(
      MIN_SPEED_PX_PER_SECOND,
      MAX_SPEED_PX_PER_SECOND,
      MIN_SPEED_CHANGE_SECONDS,
      MAX_SPEED_CHANGE_SECONDS,
    );
    let flight: ReturnType<typeof createBeeTwoFlight> = null;
    let area = getBeeTwoArea(0, 0, 0, usesFullViewport);
    let pixelRatio = 0;
    let frame: number | null = null;
    let previousTime: number | null = null;
    let activeSeconds = 0;
    let lastSampleTime = -Infinity;
    let trail: TrailPoint[] = [];
    let color = getComputedStyle(viewport).color;

    const adjustedTrailOpacity = aboveContent ? TRAIL_OPACITY : TRAIL_OPACITY * 0.5;

    const paintTrail = (now: number) => {
      context.clearRect(0, 0, area.width, area.height);
      // Retain one anchor for a live segment even when that anchor's own segment expired.
      while (trail.length > 1 && now - trail[1].created >= TRAIL_LIFETIME_SECONDS) trail.shift();
      context.strokeStyle = color;
      context.lineWidth = TRAIL_WIDTH;
      context.lineCap = 'butt';
      context.lineJoin = 'round';
      // context.lineCap = 'round';
      for (let index = 1; index < trail.length; index++) {
        const start = trail[index - 1];
        const end = trail[index];
        context.globalAlpha =
          adjustedTrailOpacity *
          end.opacity *
          beeTwoTrailOpacity(now - end.created, TRAIL_LIFETIME_SECONDS);
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
      }
      context.globalAlpha = 1;
    };

    const animate = (timestamp: number) => {
      frame = null;
      if (!flight) return;
      const now = timestamp / 1000;
      let seconds = 0;
      if (previousTime !== null) seconds = Math.min(0.1, Math.max(0, now - previousTime));
      previousTime = now;
      activeSeconds += seconds;

      // Trapezoidal integration keeps travelled distance stable across frame rates.
      const startSpeed = speed.advance(0);
      const endSpeed = speed.advance(seconds);
      const pose = flight.advance(((startSpeed + endSpeed) / 2) * seconds, seconds);
      const opacity = beeTwoEase(activeSeconds / FADE_IN_SECONDS);
      bee.style.opacity = String(opacity);
      bee.style.transform = `translate(${pose.x}px, ${pose.y}px) translate(-50%, -50%) rotate(${pose.angle + Math.PI / 2}rad)`;

      if (now - lastSampleTime >= 1 / TRAIL_SAMPLES_PER_SECOND) {
        // Do not connect a fresh sample to a completely expired trail after a pause.
        if (trail.length && now - trail[trail.length - 1].created >= TRAIL_LIFETIME_SECONDS) {
          trail = [];
        }
        trail.push({ x: pose.x, y: pose.y, created: now, opacity });
        if (trail.length > MAX_TRAIL_SAMPLES) trail.shift();
        lastSampleTime = now;
      }
      paintTrail(now);
      frame = requestAnimationFrame(animate);
    };

    const syncActivity = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previousTime = null;
      if (reducedMotion.matches || !flight) {
        viewport.style.visibility = 'hidden';
        trail = [];
        activeSeconds = 0;
        bee.style.opacity = '0';
        context.clearRect(0, 0, area.width, area.height);
        return;
      }
      viewport.style.visibility = 'visible';
      viewport.style.opacity = '1';
      if (document.hidden) return;
      frame = requestAnimationFrame(animate);
    };

    const measure = () => {
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const next = getBeeTwoArea(
        window.innerWidth,
        window.innerHeight,
        headerHeight,
        usesFullViewport,
      );
      const nextPixelRatio = window.devicePixelRatio || 1;
      if (
        next.width === area.width &&
        next.height === area.height &&
        next.top === area.top &&
        nextPixelRatio === pixelRatio
      ) {
        return;
      }
      area = next;
      pixelRatio = nextPixelRatio;
      viewport.style.top = `${area.top}px`;
      canvas.width = Math.round(area.width * pixelRatio);
      canvas.height = Math.round(area.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      // Computed dimensions still work when reduced-motion CSS hides the wrapper.
      // Half the icon diagonal protects a rotated bee; include the trail stroke.
      const beeStyle = getComputedStyle(bee);
      const beeWidth = Number.parseFloat(beeStyle.width) || 12;
      const beeHeight = Number.parseFloat(beeStyle.height) || 12;
      const clearance = Math.hypot(beeWidth, beeHeight) / 2 + TRAIL_WIDTH;
      flight = createBeeTwoFlight(area, {
        loopSizeRatio: LOOP_SIZE_RATIO,
        loopVariation: LOOP_SIZE_VARIATION,
        outerPaddingRatio: OUTER_PADDING_RATIO,
        travelIntensity: TRAVEL_INTENSITY,
        loopSpacingRatio: LOOP_SPACING_RATIO,
        maxQuadrantSeconds: MAX_QUADRANT_SECONDS,
        minTurnDegrees: MIN_TURN,
        maxTurnDegrees: MAX_TURN,
        excludeCenter: !aboveContent,
        clearance,
      });
      trail = [];
      lastSampleTime = -Infinity;
      activeSeconds = 0;
      bee.style.opacity = '0';
      syncActivity();
    };

    const headerObserver = new ResizeObserver(measure);
    if (header && !usesFullViewport) headerObserver.observe(header);
    const themeObserver = new MutationObserver(() => {
      color = getComputedStyle(viewport).color;
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    reducedMotion.addEventListener('change', syncActivity);
    document.addEventListener('visibilitychange', syncActivity);
    window.addEventListener('resize', measure);
    measure();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      headerObserver.disconnect();
      themeObserver.disconnect();
      reducedMotion.removeEventListener('change', syncActivity);
      document.removeEventListener('visibilitychange', syncActivity);
      window.removeEventListener('resize', measure);
      viewport.style.visibility = 'hidden';
      viewport.style.opacity = '0';
    };
  }, [usesFullViewport, aboveContent]);

  return (
    <div
      ref={viewportRef}
      aria-hidden='true'
      className={`bee-animation pointer-events-none invisible opacity-0 fixed inset-x-0 bottom-0 ${topClasses} ${layerClass} overflow-hidden text-stone-700 dark:text-stone-300`}
    >
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 size-full' />
      <div ref={beeRef} className='absolute top-0 left-0 size-4 will-change-transform'>
        <Bug className='size-full' />
      </div>
    </div>
  );
}
