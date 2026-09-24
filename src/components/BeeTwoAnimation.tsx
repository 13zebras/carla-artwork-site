import { Bug } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { DEFAULT_BEE_SETTINGS } from '@/lib/shared/bee-settings';
import type { BeeSettings } from '@/lib/shared/bee-settings';
import {
  beeTwoTrailOpacity,
  createBeeTwoFlight,
  createBeeTwoSpeed,
  getBeeTwoArea,
} from '@/lib/shared/bee-two-animation';
import type { BeeTwoPoint, BeeTwoPose } from '@/lib/shared/bee-two-animation';
import { cn } from '@/lib/shared/utils';

// Above-content mode removes the central exclusion and always uses the full viewport.
// FULL_VIEWPORT controls header exclusion only when flying behind the content.
const ABOVE_CONTENT = false;
const FULL_VIEWPORT = true;

// Outer margin relative to container width/height: 0.02 = 2% inward; 0 = no extra gap.
// Negative values (try -0.03) let loops extend past the edges and disappear/reappear.
// Icon clearance offsets this margin; smaller random loops may not reach its limit.
const OUTER_PADDING_RATIO = -0.08;

// Degrees for each of the two gradual, randomly left/right quadrant-travel turns.
const MIN_TURN = 40;
const MAX_TURN = 60;

const MIN_SPEED_CHANGE_SECONDS = 3;
const MAX_SPEED_CHANGE_SECONDS = 6;
const TRAIL_SAMPLES_PER_SECOND = 30;
const beeColor = 'text-neutral-950 dark:text-neutral-50';
const trailColor = 'text-neutral-950 dark:text-neutral-50';

const TRAIL_DASH_LENGTH = 8;
const TRAIL_GAP_LENGTH = 10;
const XS_BREAKPOINT_PX = 560;

// Optional overrides also let tests exercise all four switch combinations.
type BeeTwoAnimationProps = {
  aboveContent?: boolean;
  fullViewport?: boolean;
  settings?: BeeSettings;
};
type TrailPoint = BeeTwoPoint & {
  created: number;
  distance: number;
};

export function BeeTwoAnimation({
  aboveContent = ABOVE_CONTENT,
  fullViewport = FULL_VIEWPORT,
  settings = DEFAULT_BEE_SETTINGS,
}: BeeTwoAnimationProps = {}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beeRef = useRef<HTMLDivElement>(null);
  const usesFullViewport = aboveContent || fullViewport;
  const topClasses = usesFullViewport ? 'top-0' : 'top-44 xxs:top-42 xs:top-40 sm:top-42 xl:top-38';
  const layerClass = aboveContent ? 'z-30' : '-z-10';

  useEffect(() => {
    // Only the existing inputs are configurable; flight constraints stay in the engine.
    const {
      minSpeed: MIN_SPEED_PX_PER_SECOND,
      maxSpeed: MAX_SPEED_PX_PER_SECOND,
      trailLifetime: TRAIL_LIFETIME_SECONDS,
      loopSize: LOOP_SIZE_RATIO,
      travelIntensity: TRAVEL_INTENSITY,
      loopSpacing: LOOP_SPACING_RATIO,
      trailOpacity: TRAIL_OPACITY,
      maxQuadrantSeconds: MAX_QUADRANT_SECONDS,
      loopVariation: LOOP_SIZE_VARIATION,
      trailWidth: TRAIL_WIDTH,
    } = settings;
    const MAX_TRAIL_SAMPLES = Math.ceil(TRAIL_LIFETIME_SECONDS * TRAIL_SAMPLES_PER_SECOND) + 2;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    const bee = beeRef.current;
    if (!viewport || !canvas || !bee) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const header = document.querySelector<HTMLElement>('[data-site-header]');
    const wideLogo = document.querySelector<HTMLElement>('[data-bee-logo="wide"]');
    const compactLogo = document.querySelector<HTMLElement>('[data-bee-logo="compact"]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const speed = createBeeTwoSpeed(
      MIN_SPEED_PX_PER_SECOND,
      MAX_SPEED_PX_PER_SECOND,
      MIN_SPEED_CHANGE_SECONDS,
      MAX_SPEED_CHANGE_SECONDS,
    );
    let flight: ReturnType<typeof createBeeTwoFlight> = null;
    let area = getBeeTwoArea(0, 0, 0, usesFullViewport);
    let initialPoint: BeeTwoPoint | undefined;
    let pixelRatio = 0;
    let frame: number | null = null;
    let previousTime: number | null = null;
    let lastSampleTime = -Infinity;
    let trail: TrailPoint[] = [];
    let color = getComputedStyle(viewport).color;

    const adjustedTrailOpacity = aboveContent ? TRAIL_OPACITY : TRAIL_OPACITY * 0.5;
    const positionBee = (pose: BeeTwoPose) => {
      bee.style.transform = `translate(${pose.x}px, ${pose.y}px) translate(-50%, -50%) rotate(${pose.angle + Math.PI / 2}rad)`;
    };

    const paintTrail = (now: number) => {
      context.clearRect(0, 0, area.width, area.height);
      // Retain one anchor for a live segment even when that anchor's own segment expired.
      while (trail.length > 1 && now - trail[1].created >= TRAIL_LIFETIME_SECONDS) trail.shift();
      context.strokeStyle = color;
      context.lineWidth = TRAIL_WIDTH;
      context.lineCap = 'butt';
      context.lineJoin = 'round';
      const period = TRAIL_DASH_LENGTH + TRAIL_GAP_LENGTH;
      const first = trail[0];
      const last = trail[trail.length - 1];
      if (!first || !last) return;

      // Build each dash as one path across sample boundaries. Restarting Canvas's
      // dashed stroke for every short sample produces uneven, broken dashes.
      let index = 0;
      const pointAt = (distance: number) => {
        const start = trail[index];
        const end = trail[index + 1];
        const fraction = (distance - start.distance) / (end.distance - start.distance);
        return {
          x: start.x + (end.x - start.x) * fraction,
          y: start.y + (end.y - start.y) * fraction,
          created: start.created + (end.created - start.created) * fraction,
        };
      };
      for (
        let dashStart = Math.floor(first.distance / period) * period;
        dashStart < last.distance;
        dashStart += period
      ) {
        const visibleStart = Math.max(first.distance, dashStart);
        const visibleEnd = Math.min(last.distance, dashStart + TRAIL_DASH_LENGTH);
        if (visibleEnd <= visibleStart) continue;
        while (index < trail.length - 2 && trail[index + 1].distance <= visibleStart) index++;
        const start = pointAt(visibleStart);
        context.beginPath();
        context.moveTo(start.x, start.y);
        while (index < trail.length - 2 && trail[index + 1].distance < visibleEnd) {
          index++;
          context.lineTo(trail[index].x, trail[index].y);
        }
        const end = pointAt(visibleEnd);
        context.lineTo(end.x, end.y);
        context.globalAlpha =
          adjustedTrailOpacity * beeTwoTrailOpacity(now - end.created, TRAIL_LIFETIME_SECONDS);
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

      // Trapezoidal integration keeps travelled distance stable across frame rates.
      const startSpeed = speed.advance(0);
      const endSpeed = speed.advance(seconds);
      const pose = flight.advance(((startSpeed + endSpeed) / 2) * seconds, seconds);
      positionBee(pose);

      if (now - lastSampleTime >= 1 / TRAIL_SAMPLES_PER_SECOND) {
        // Do not connect a fresh sample to a completely expired trail after a pause.
        if (trail.length && now - trail[trail.length - 1].created >= TRAIL_LIFETIME_SECONDS) {
          trail = [];
        }
        const previous = trail[trail.length - 1];
        const distance = previous
          ? previous.distance + Math.hypot(pose.x - previous.x, pose.y - previous.y)
          : 0;
        trail.push({ x: pose.x, y: pose.y, created: now, distance });
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
        context.clearRect(0, 0, area.width, area.height);
        return;
      }
      viewport.style.visibility = 'visible';
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
      const isWide = window.innerWidth >= XS_BREAKPOINT_PX;
      const logo = isWide ? wideLogo : compactLogo;
      const logoBounds = logo?.getBoundingClientRect();
      const nextInitialPoint =
        usesFullViewport && logoBounds
          ? {
              x: logoBounds.left + logoBounds.width * (isWide ? 0.06 : 0.12),
              y: logoBounds.top + logoBounds.height * 0.5 - next.top,
            }
          : undefined;
      if (
        next.width === area.width &&
        next.height === area.height &&
        next.top === area.top &&
        nextPixelRatio === pixelRatio &&
        nextInitialPoint?.x === initialPoint?.x &&
        nextInitialPoint?.y === initialPoint?.y
      ) {
        return;
      }
      area = next;
      pixelRatio = nextPixelRatio;
      initialPoint = nextInitialPoint;
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
        initialPoint,
      });
      trail = [];
      lastSampleTime = -Infinity;
      if (flight) positionBee(flight.advance(0));
      syncActivity();
    };

    const headerObserver = new ResizeObserver(measure);
    if (header && !usesFullViewport) headerObserver.observe(header);
    if (usesFullViewport && wideLogo) headerObserver.observe(wideLogo);
    if (usesFullViewport && compactLogo) headerObserver.observe(compactLogo);
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
    };
  }, [usesFullViewport, aboveContent, settings]);

  return (
    <div
      ref={viewportRef}
      aria-hidden='true'
      className={cn(
        'bee-animation pointer-events-none invisible fixed inset-x-0 bottom-0 overflow-hidden',
        trailColor,
        topClasses,
        layerClass,
      )}
    >
      <canvas ref={canvasRef} aria-hidden='true' className='absolute inset-0 size-full' />
      <div
        ref={beeRef}
        className='absolute top-0 left-0 will-change-transform'
        style={{ width: settings.size, height: settings.size }}
      >
        <Bug className={cn('size-full', beeColor)} />
      </div>
    </div>
  );
}
