// Independent BeeTwo geometry. All positions are local to its flight container.
export type BeeTwoPoint = { x: number; y: number };
export type BeeTwoArea = { width: number; height: number; top: number };
export type BeeTwoPose = BeeTwoPoint & { angle: number; phase: 'travel' | 'loop' };

type Random = () => number;
type FlightSettings = {
  loopSizeRatio: number;
  loopVariation: number;
  outerPaddingRatio: number;
  travelIntensity: number;
  clearance: number;
};
type Radii = { x: number; y: number };

const TAU = Math.PI * 2;
const CURVE_SAMPLES = 360;
// Centered exclusion: 40–60vw across the full-width container, and 40–60% of its height.
const CENTER_MIN_RATIO = 0.4;
const CENTER_MAX_RATIO = 1 - CENTER_MIN_RATIO;

export function getBeeTwoArea(
  width: number,
  viewportHeight: number,
  headerHeight: number,
  fullViewport: boolean,
): BeeTwoArea {
  const top = fullViewport ? 0 : Math.min(viewportHeight, Math.max(0, headerHeight));
  return { width, height: Math.max(0, viewportHeight - top), top };
}

export function beeTwoEase(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function beeTwoTrailOpacity(ageSeconds: number, lifetimeSeconds: number): number {
  return 1 - Math.max(0, Math.min(1, ageSeconds / lifetimeSeconds));
}

/** A rounded rectangular guide, travelled at constant distance per revolution. */
function createGuide(
  area: BeeTwoArea,
  paddingRatio: number,
  orbitRadius: number,
  clearance: number,
  depth: number,
) {
  const radius = Math.min(area.width, area.height) * 0.055;
  const cornerInset = radius * (1 - Math.SQRT1_2);
  const outerLeft = area.width * paddingRatio + orbitRadius + clearance;
  const outerTop = area.height * paddingRatio + orbitRadius + clearance;
  const innerLeft = area.width * CENTER_MIN_RATIO - orbitRadius - clearance - cornerInset;
  const innerTop = area.height * CENTER_MIN_RATIO - orbitRadius - clearance - cornerInset;
  // Depth moves the guide between the outer edge and the central exclusion.
  // Every intermediate guide fits the entire orbit, including at rounded corners.
  const left = outerLeft + Math.max(0, innerLeft - outerLeft) * depth;
  const top = outerTop + Math.max(0, innerTop - outerTop) * depth;
  const right = area.width - left;
  const bottom = area.height - top;
  const horizontal = right - left - 2 * radius;
  const vertical = bottom - top - 2 * radius;
  const corner = (Math.PI / 2) * radius;
  const lengths = [horizontal, corner, vertical, corner, horizontal, corner, vertical, corner];
  const perimeter = lengths.reduce((sum, length) => sum + length, 0);

  function point(distance: number): BeeTwoPoint {
    let remaining = ((distance % perimeter) + perimeter) % perimeter;
    let section = 0;
    while (section < lengths.length - 1 && remaining > lengths[section]) {
      remaining -= lengths[section];
      section++;
    }
    const arcAngle = remaining / radius;
    switch (section) {
      case 0:
        return { x: left + radius + remaining, y: top };
      case 1:
        return {
          x: right - radius + radius * Math.sin(arcAngle),
          y: top + radius - radius * Math.cos(arcAngle),
        };
      case 2:
        return { x: right, y: top + radius + remaining };
      case 3:
        return {
          x: right - radius + radius * Math.cos(arcAngle),
          y: bottom - radius + radius * Math.sin(arcAngle),
        };
      case 4:
        return { x: right - radius - remaining, y: bottom };
      case 5:
        return {
          x: left + radius - radius * Math.sin(arcAngle),
          y: bottom - radius + radius * Math.cos(arcAngle),
        };
      case 6:
        return { x: left, y: bottom - radius - remaining };
      default:
        return {
          x: left + radius - radius * Math.cos(arcAngle),
          y: top + radius - radius * Math.sin(arcAngle),
        };
    }
  }

  return { point, perimeter };
}

/**
 * Alternate travel and loop segments. Travel changes depth, position, radii and
 * heading; the following loop revolves at that new location. Travel handles match
 * the guide tangent; eased revolutions leave that same tangent at each loop end.
 */
export function createBeeTwoFlight(
  area: BeeTwoArea,
  settings: FlightSettings,
  random: Random = Math.random,
): { advance: (distance: number) => BeeTwoPose } | null {
  const smallerSide = Math.min(area.width, area.height);
  // Negative padding extends the flight beyond the container; its overflow clips
  // the bee/trail naturally. The central exclusion still uses the original area.
  const paddingRatio = settings.outerPaddingRatio;
  // At a rounded corner, at least one axis is this close to its straight strip.
  const cornerInset = smallerSide * 0.055 * (1 - Math.SQRT1_2);
  // The central exclusion leaves a 40% flight band along each container edge.
  const availableBand = smallerSide * (CENTER_MIN_RATIO - paddingRatio);
  const maximumRadius = (availableBand - cornerInset) / 2 - settings.clearance;
  if (maximumRadius < 2 || settings.loopSizeRatio <= 0) return null;

  const intensity = Math.max(0, Math.min(1, settings.travelIntensity));
  const variation = Math.max(0, Math.min(0.4, settings.loopVariation));
  // Reserve room for lateral travel even when the requested loop size fills the band.
  const baseRadius = Math.min(
    (smallerSide * settings.loopSizeRatio) / 2,
    maximumRadius / ((1 + variation) * (1 + intensity)),
  );
  const orbitRadius = baseRadius * (1 + variation);
  const loopDrift = baseRadius * 0.3;
  const direction = random() < 0.5 ? -1 : 1;
  type Anchor = { progress: number; depth: number; radii: Radii; angle: number };
  type Segment = {
    phase: BeeTwoPose['phase'];
    nextPhase: BeeTwoPose['phase'];
    end: Anchor;
    pointAt: (t: number) => BeeTwoPoint;
    lengths: number[];
  };

  const guideAt = (depth: number) =>
    createGuide(area, paddingRatio, orbitRadius, settings.clearance, depth);

  function randomRadii(): Radii {
    return {
      x: baseRadius * (1 - variation + 2 * variation * random()),
      y: baseRadius * (1 - variation + 2 * variation * random()),
    };
  }

  function loopAngle(progress: number, depth: number): number {
    const guide = guideAt(depth);
    const distance = progress * guide.perimeter + loopDrift / 2;
    const before = guide.point(distance - 0.01);
    const after = guide.point(distance + 0.01);
    // Start/end a revolution facing along the guide, not against it.
    return Math.atan2(after.y - before.y, after.x - before.x) - (direction * Math.PI) / 2;
  }

  function orbit(center: BeeTwoPoint, radii: Radii, angle: number): BeeTwoPoint {
    return { x: center.x + radii.x * Math.cos(angle), y: center.y + radii.y * Math.sin(angle) };
  }

  function measureSegment(
    phase: BeeTwoPose['phase'],
    end: Anchor,
    pointAt: Segment['pointAt'],
    nextPhase: BeeTwoPose['phase'] = phase === 'travel' ? 'loop' : 'travel',
  ): Segment {
    const lengths = [0];
    let previous = pointAt(0);
    for (let index = 1; index <= CURVE_SAMPLES; index++) {
      const point = pointAt(index / CURVE_SAMPLES);
      lengths.push(lengths[index - 1] + Math.hypot(point.x - previous.x, point.y - previous.y));
      previous = point;
    }
    return { phase, nextPhase, end, pointAt, lengths };
  }

  function guideTangent(anchor: Anchor): BeeTwoPoint {
    const guide = guideAt(anchor.depth);
    const distance = anchor.progress * guide.perimeter;
    const before = guide.point(distance - 0.001);
    const after = guide.point(distance + 0.001);
    const length = Math.hypot(after.x - before.x, after.y - before.y);
    return { x: (after.x - before.x) / length, y: (after.y - before.y) / length };
  }

  function anchorPoint(anchor: Anchor): BeeTwoPoint {
    const guide = guideAt(anchor.depth);
    return orbit(guide.point(anchor.progress * guide.perimeter), anchor.radii, anchor.angle);
  }

  function safeControls(points: BeeTwoPoint[]): boolean {
    const marginX = area.width * paddingRatio + settings.clearance;
    const marginY = area.height * paddingRatio + settings.clearance;
    if (
      points.some(
        (p) =>
          p.x < marginX ||
          p.x > area.width - marginX ||
          p.y < marginY ||
          p.y > area.height - marginY,
      )
    )
      return false;
    // A Bezier stays in its control points' convex hull. Requiring a shared strip
    // proves the ENTIRE connector is safe, not just a finite set of samples.
    return (
      points.every((p) => p.x <= area.width * CENTER_MIN_RATIO - settings.clearance) ||
      points.every((p) => p.x >= area.width * CENTER_MAX_RATIO + settings.clearance) ||
      points.every((p) => p.y <= area.height * CENTER_MIN_RATIO - settings.clearance) ||
      points.every((p) => p.y >= area.height * CENTER_MAX_RATIO + settings.clearance)
    );
  }

  function travelSegment(start: Anchor): Segment {
    const guide = guideAt(start.depth);
    const p0 = anchorPoint(start);
    const tangent0 = guideTangent(start);
    for (let attempt = 0; attempt < 8; attempt++) {
      const depth = random() * intensity;
      // Even at zero intensity, exceed the minimum connector chord below so a
      // valid short connector can start a loop instead of endlessly following the guide.
      const distance = baseRadius + smallerSide * (0.08 + random() * 0.24) * intensity;
      const progress = (start.progress + distance / guide.perimeter) % 1;
      const end: Anchor = {
        progress,
        depth,
        radii: randomRadii(),
        angle: loopAngle(progress, depth),
      };
      const p3 = anchorPoint(end);
      const tangent1 = guideTangent(end);
      const dx = p3.x - p0.x;
      const dy = p3.y - p0.y;
      const length = Math.hypot(dx, dy);
      // Forward-facing endpoints and handles a third of the chord prevent cusps.
      if (
        length < baseRadius * 0.75 ||
        dx * tangent0.x + dy * tangent0.y <= 0 ||
        dx * tangent1.x + dy * tangent1.y <= 0
      )
        continue;
      const handle = length / 3;
      const p1 = { x: p0.x + tangent0.x * handle, y: p0.y + tangent0.y * handle };
      const p2 = { x: p3.x - tangent1.x * handle, y: p3.y - tangent1.y * handle };
      if (!safeControls([p0, p1, p2, p3])) continue;
      return measureSegment('travel', end, (t) => {
        const u = 1 - t;
        return {
          x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * p3.x,
          y: u ** 3 * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * p3.y,
        };
      });
    }
    // Around corners, keep travelling along the safe guide until a connector can
    // align the next loop with its new heading. Starting a loop too early makes
    // its orbit fight the guide direction and produces an unnecessarily tight turn.
    const distance = baseRadius * 0.6;
    const end = { ...start, progress: (start.progress + distance / guide.perimeter) % 1 };
    return measureSegment(
      'travel',
      end,
      (t) =>
        orbit(
          guide.point(start.progress * guide.perimeter + distance * t),
          start.radii,
          start.angle,
        ),
      'travel',
    );
  }

  function loopSegment(start: Anchor): Segment {
    const guide = guideAt(start.depth);
    const end = { ...start, progress: (start.progress + loopDrift / guide.perimeter) % 1 };
    return measureSegment('loop', end, (t) => {
      const center = guide.point(start.progress * guide.perimeter + loopDrift * t);
      return orbit(center, start.radii, start.angle + direction * TAU * beeTwoEase(t));
    });
  }

  const progress = random();
  const depth = random() * intensity;
  let segment = travelSegment({
    progress,
    depth,
    radii: randomRadii(),
    angle: loopAngle(progress, depth),
  });
  let distanceInSegment = 0;

  function advance(distance: number): BeeTwoPose {
    distanceInSegment += Math.max(0, distance);
    while (distanceInSegment >= segment.lengths[CURVE_SAMPLES]) {
      distanceInSegment -= segment.lengths[CURVE_SAMPLES];
      if (segment.nextPhase === 'loop') {
        segment = loopSegment(segment.end);
        continue;
      }
      segment = travelSegment(segment.end);
    }

    const { pointAt, lengths, phase } = segment;
    let low = 0;
    let high = CURVE_SAMPLES;
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (lengths[middle] <= distanceInSegment) low = middle;
      else high = middle;
    }
    const fraction = (distanceInSegment - lengths[low]) / (lengths[high] - lengths[low]);
    const t = (low + fraction) / CURVE_SAMPLES;
    const point = pointAt(t);
    const before = pointAt(t - 0.00001);
    const after = pointAt(t + 0.00001);
    return { ...point, angle: Math.atan2(after.y - before.y, after.x - before.x), phase };
  }

  return { advance };
}

/** Quintic speed changes have zero acceleration at joins, with random targets/timing. */
export function createBeeTwoSpeed(
  min: number,
  max: number,
  minChangeSeconds: number,
  maxChangeSeconds: number,
  random: Random = Math.random,
): { advance: (seconds: number) => number } {
  const pickSpeed = () => min + random() * (max - min);
  const pickDuration = () => minChangeSeconds + random() * (maxChangeSeconds - minChangeSeconds);
  let from = pickSpeed();
  let to = pickSpeed();
  let duration = pickDuration();
  let elapsed = 0;

  return {
    advance(seconds) {
      elapsed += Math.max(0, seconds);
      while (elapsed >= duration) {
        elapsed -= duration;
        from = to;
        to = pickSpeed();
        duration = pickDuration();
      }
      return from + (to - from) * beeTwoEase(elapsed / duration);
    },
  };
}
