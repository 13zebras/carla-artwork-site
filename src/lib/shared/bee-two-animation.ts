import { createBeeTwoQuadrantTravel } from '@/lib/shared/bee-two-quadrant-travel';

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
  loopSpacingRatio?: number;
  maxQuadrantSeconds?: number;
  minTurnDegrees?: number;
  maxTurnDegrees?: number;
  excludeCenter?: boolean;
  clearance: number;
};
type Radii = { x: number; y: number };

const TAU = Math.PI * 2;
// Keep distance-based speed accurate even on large, viewport-spanning curves.
const CURVE_SAMPLES = 720;
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
  excludeCenter: boolean,
) {
  const radius = Math.min(area.width, area.height) * 0.055;
  const cornerInset = radius * (1 - Math.SQRT1_2);
  const outerLeft = area.width * paddingRatio + orbitRadius + clearance;
  const outerTop = area.height * paddingRatio + orbitRadius + clearance;
  const innerLeft = excludeCenter
    ? area.width * CENTER_MIN_RATIO - orbitRadius - clearance - cornerInset
    : area.width / 2 - radius;
  const innerTop = excludeCenter
    ? area.height * CENTER_MIN_RATIO - orbitRadius - clearance - cornerInset
    : area.height / 2 - radius;
  // Without an exclusion, guides can move right into the middle of the viewport.
  // Keep a rounded guide even at maximum depth, so its tangent remains defined.
  // Every intermediate guide fits the entire orbit inside the outer boundary.
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
 * heading and guide direction; the following loop revolves at that new location.
 * Travel handles match signed guide tangents, so direction changes happen through
 * smooth connectors, never by flipping the bee's velocity in place.
 */
export function createBeeTwoFlight(
  area: BeeTwoArea,
  settings: FlightSettings,
  random: Random = Math.random,
): { advance: (distance: number, seconds?: number) => BeeTwoPose } | null {
  const smallerSide = Math.min(area.width, area.height);
  const excludeCenter = settings.excludeCenter ?? true;
  // Negative padding extends the flight beyond the container; its overflow clips
  // the bee/trail naturally. The central exclusion still uses the original area.
  const paddingRatio = settings.outerPaddingRatio;
  // At a rounded corner, at least one axis is this close to its straight strip.
  const cornerInset = smallerSide * 0.055 * (1 - Math.SQRT1_2);
  // The central exclusion leaves a 40% flight band along each container edge.
  const availableBand = smallerSide * (CENTER_MIN_RATIO - paddingRatio);
  const maximumRadius = excludeCenter
    ? (availableBand - cornerInset) / 2 - settings.clearance
    : smallerSide * (0.5 - paddingRatio - 0.055) - settings.clearance;
  if (maximumRadius < 2 || settings.loopSizeRatio <= 0) return null;

  const intensity = Math.max(0, Math.min(1, settings.travelIntensity));
  const loopSpacingRatio = Math.max(0, settings.loopSpacingRatio ?? 1);
  const variation = Math.max(0, Math.min(0.4, settings.loopVariation));
  // Reserve room for lateral travel even when the requested loop size fills the band.
  const baseRadius = Math.min(
    (smallerSide * settings.loopSizeRatio) / 2,
    maximumRadius / ((1 + variation) * (1 + intensity)),
  );
  const orbitRadius = baseRadius * (1 + variation);
  const loopDrift = baseRadius * 0.3;
  const initialDirection = random() < 0.5 ? -1 : 1;
  const initialGuideDirection = random() < 0.5 ? -1 : 1;
  const nextDirectionChange = () => 1 + Math.floor(random() * 2);
  let loopsUntilDirectionChange = nextDirectionChange();
  type Anchor = {
    progress: number;
    depth: number;
    radii: Radii;
    angle: number;
    direction: -1 | 1;
    guideDirection: -1 | 1;
    pose?: BeeTwoPoint & { angle: number };
  };
  type Segment = {
    phase: BeeTwoPose['phase'];
    nextPhase: BeeTwoPose['phase'];
    end: Anchor;
    pointAt: (t: number) => BeeTwoPoint;
    lengths: number[];
  };

  const guideAt = (depth: number) =>
    createGuide(area, paddingRatio, orbitRadius, settings.clearance, depth, excludeCenter);

  const maxQuadrantSeconds = Math.max(1, settings.maxQuadrantSeconds ?? 15);
  const quadrantSeconds = [0, 0, 0, 0];
  const lastVisited = [-1, -1, -1, -1];
  let activeSeconds = 0;
  let targetQuadrant: number | null = null;

  function quadrantAt(point: BeeTwoPoint): number {
    const column = point.x < area.width / 2 ? 0 : 1;
    const row = point.y < area.height / 2 ? 0 : 1;
    return row * 2 + column;
  }

  function insideQuadrant(point: BeeTwoPoint, quadrant: number): boolean {
    // Require a visible arrival well inside the quadrant, not a tiny excursion
    // over a center line followed by more loops in the original patch.
    return (
      quadrantAt(point) === quadrant &&
      Math.abs(point.x - area.width / 2) >= area.width * 0.1 &&
      Math.abs(point.y - area.height / 2) >= area.height * 0.1 &&
      point.x >= settings.clearance &&
      point.x <= area.width - settings.clearance &&
      point.y >= settings.clearance &&
      point.y <= area.height - settings.clearance
    );
  }

  function trackQuadrants(point: BeeTwoPoint, seconds: number) {
    const elapsed = Math.max(0, seconds);
    activeSeconds += elapsed;
    const quadrant = quadrantAt(point);
    if (targetQuadrant !== null) return;
    // Accumulate residence rather than resetting on every border crossing: a
    // loop straddling two quadrants must not defeat the exploration limit.
    quadrantSeconds[quadrant] += elapsed;
    if (quadrantSeconds[quadrant] < maxQuadrantSeconds) return;
    const others = [0, 1, 2, 3].filter((candidate) => candidate !== quadrant);
    // Passing through does not count as a visit: distribute the loops as well
    // as the travel, instead of repeatedly looping in just two quadrants.
    const oldestVisit = Math.min(...others.map((candidate) => lastVisited[candidate]));
    const candidates = others.filter((candidate) => lastVisited[candidate] === oldestVisit);
    targetQuadrant = candidates[Math.floor(random() * candidates.length)];
  }

  function randomRadii(): Radii {
    return {
      x: baseRadius * (1 - variation + 2 * variation * random()),
      y: baseRadius * (1 - variation + 2 * variation * random()),
    };
  }

  function loopAngle(
    progress: number,
    depth: number,
    direction: Anchor['direction'],
    guideDirection: Anchor['guideDirection'],
  ): number {
    const guide = guideAt(depth);
    const distance = progress * guide.perimeter + (loopDrift * guideDirection) / 2;
    const before = guide.point(distance - 0.01 * guideDirection);
    const after = guide.point(distance + 0.01 * guideDirection);
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
    if (anchor.pose) return { x: Math.cos(anchor.pose.angle), y: Math.sin(anchor.pose.angle) };
    const guide = guideAt(anchor.depth);
    const distance = anchor.progress * guide.perimeter;
    const before = guide.point(distance - 0.001);
    const after = guide.point(distance + 0.001);
    const length = Math.hypot(after.x - before.x, after.y - before.y);
    return {
      x: ((after.x - before.x) / length) * anchor.guideDirection,
      y: ((after.y - before.y) / length) * anchor.guideDirection,
    };
  }

  function anchorPoint(anchor: Anchor): BeeTwoPoint {
    if (anchor.pose) return anchor.pose;
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
    if (!excludeCenter) return true;
    // A Bezier stays in its control points' convex hull. Requiring a shared strip
    // proves the ENTIRE connector is safe, not just a finite set of samples.
    return (
      points.every((p) => p.x <= area.width * CENTER_MIN_RATIO - settings.clearance) ||
      points.every((p) => p.x >= area.width * CENTER_MAX_RATIO + settings.clearance) ||
      points.every((p) => p.y <= area.height * CENTER_MIN_RATIO - settings.clearance) ||
      points.every((p) => p.y >= area.height * CENTER_MAX_RATIO + settings.clearance)
    );
  }

  function connectorSegment(start: Anchor): Segment | null {
    const guide = guideAt(start.depth);
    const p0 = anchorPoint(start);
    const tangent0 = guideTangent(start);
    // Pick the next loop's handedness before planning its connector. Its entry
    // angle must match that direction; flipping only at loop entry would jump.
    const direction = random() < 0.5 ? -1 : 1;
    // Exploration takes priority over another local U-turn. Keep moving in one
    // direction until the destination quadrant is reached, without local loops.
    const relocating = targetQuadrant !== null;
    const reversing = !relocating && loopsUntilDirectionChange <= 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      // For a local reversal, only accept a U-turn. During relocation, keep
      // travelling until a connector can place the next loop in the target.
      const guideDirection: Anchor['guideDirection'] = reversing
        ? (-start.guideDirection as Anchor['guideDirection'])
        : start.guideDirection;
      const randomDepth = random() * intensity;
      const depth = reversing
        ? start.depth + (randomDepth - start.depth) * Math.min(1, loopSpacingRatio)
        : randomDepth;
      // Even at zero intensity, exceed the minimum connector chord below so a
      // valid short connector can start a loop instead of endlessly following the guide.
      // Unrestricted travel can connect distant sides through the viewport's center.
      const travelDistance = excludeCenter
        ? smallerSide * (0.08 + random() * 0.24)
        : guide.perimeter * (0.1 + random() * 0.5);
      const distance = baseRadius + travelDistance * intensity * loopSpacingRatio;
      // A U-turn joins a nearby parallel lane, not a point far behind the bee.
      // Its curved handles turn the heading around without a velocity jump.
      let progress = (start.progress + (distance * guideDirection) / guide.perimeter) % 1;
      if (reversing) progress = start.progress;
      // A free-steering arrival is no longer tied to its departure guide position.
      if (start.pose) progress = random();
      const end: Anchor = {
        progress,
        depth,
        radii: randomRadii(),
        angle: loopAngle(progress, depth, direction, guideDirection),
        direction,
        guideDirection,
      };
      const p3 = anchorPoint(end);
      if (targetQuadrant !== null && !insideQuadrant(p3, targetQuadrant)) continue;
      const tangent1 = guideTangent(end);
      const exitTangent = guideTangent({
        ...end,
        progress: end.progress + (loopDrift * guideDirection) / guideAt(depth).perimeter,
      });
      // Reserve rounded guide corners for travel. A loop drifting across one
      // can turn too sharply as its orbital motion starts or finishes.
      if (tangent1.x * exitTangent.x + tangent1.y * exitTangent.y < 0.9999) continue;
      const dx = p3.x - p0.x;
      const dy = p3.y - p0.y;
      const length = Math.hypot(dx, dy);
      if (length < baseRadius * 0.75) continue;
      const forward = dx * tangent0.x + dy * tangent0.y;
      let handle = length / 3;
      if (reversing) {
        const alignment = tangent0.x * tangent1.x + tangent0.y * tangent1.y;
        const lateral = Math.abs(dx * tangent0.y - dy * tangent0.x);
        // Opposing parallel headings and enough sideways room give a rounded
        // half-turn. Both handles project forward, instead of making a cusp.
        if (alignment > -0.9999 || lateral < baseRadius * 0.75 || Math.abs(forward) > lateral / 2)
          continue;
        handle = (length * 2) / 3;
      } else if (forward <= 0 || dx * tangent1.x + dy * tangent1.y <= 0) {
        continue;
      }
      const p1 = { x: p0.x + tangent0.x * handle, y: p0.y + tangent0.y * handle };
      const p2 = { x: p3.x - tangent1.x * handle, y: p3.y - tangent1.y * handle };
      if (!safeControls([p0, p1, p2, p3])) continue;
      if (reversing) loopsUntilDirectionChange = nextDirectionChange();
      return measureSegment('travel', end, (t) => {
        const u = 1 - t;
        return {
          x: u ** 3 * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * p3.x,
          y: u ** 3 * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * p3.y,
        };
      });
    }
    return null;
  }

  function relocationSegment(start: Anchor, quadrant: number): Segment | null {
    const left =
      (Math.max(settings.clearance, area.width * paddingRatio + settings.clearance) +
        area.width * CENTER_MIN_RATIO -
        settings.clearance) /
      2;
    const top =
      (Math.max(settings.clearance, area.height * paddingRatio + settings.clearance) +
        area.height * CENTER_MIN_RATIO -
        settings.clearance) /
      2;
    const goal = {
      x: quadrant % 2 === 0 ? left : area.width - left,
      y: quadrant < 2 ? top : area.height - top,
    };
    const tangent = guideTangent(start);
    const finish: { segment: Segment | null } = { segment: null };
    const minTurn = Math.max(0, settings.minTurnDegrees ?? 5);
    const result = createBeeTwoQuadrantTravel(
      { ...anchorPoint(start), angle: Math.atan2(tangent.y, tangent.x) },
      goal,
      {
        radius: Math.max(
          4,
          Math.min(smallerSide * 0.04, (availableBand - 2 * settings.clearance) / 4),
        ),
        minTurn,
        maxTurn: Math.max(minTurn, settings.maxTurnDegrees ?? 12),
        isSafe: safeControls,
        isTarget: (point) => insideQuadrant(point, quadrant),
        finish: (pose) => {
          finish.segment = connectorSegment({ ...start, pose });
          return finish.segment !== null;
        },
      },
      random,
    );
    if (!result || !finish.segment) return null;
    const { points } = result;
    const arrival = finish.segment;
    for (let index = 1; index <= CURVE_SAMPLES; index++)
      points.push(arrival.pointAt(index / CURVE_SAMPLES));
    const lengths = [0];
    for (let index = 1; index < points.length; index++) {
      lengths.push(
        lengths[index - 1] +
          Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y),
      );
    }
    return {
      phase: 'travel',
      nextPhase: 'loop',
      end: arrival.end,
      lengths,
      pointAt(t) {
        const sample = t * (points.length - 1);
        const index = Math.max(0, Math.min(points.length - 2, Math.floor(sample)));
        const fraction = sample - index;
        return {
          x: points[index].x + (points[index + 1].x - points[index].x) * fraction,
          y: points[index].y + (points[index + 1].y - points[index].y) * fraction,
        };
      },
    };
  }

  function travelSegment(start: Anchor): Segment {
    if (targetQuadrant !== null) {
      const relocation = relocationSegment(start, targetQuadrant);
      if (relocation) return relocation;
    }
    if (targetQuadrant === null) {
      const connector = connectorSegment(start);
      if (connector) return connector;
    }
    const guide = guideAt(start.depth);
    // Around corners, keep travelling along the safe guide until a connector can
    // align the next loop with its new heading. Starting a loop too early makes
    // its orbit fight the guide direction and produces an unnecessarily tight turn.
    const distance = baseRadius * 0.6 * start.guideDirection;
    const end = { ...start, progress: (start.progress + distance / guide.perimeter) % 1 };
    const pointAt = (t: number) =>
      orbit(guide.point(start.progress * guide.perimeter + distance * t), start.radii, start.angle);
    return measureSegment('travel', end, pointAt, 'travel');
  }

  function loopSegment(start: Anchor): Segment {
    const guide = guideAt(start.depth);
    const drift = loopDrift * start.guideDirection;
    const end = { ...start, progress: (start.progress + drift / guide.perimeter) % 1 };
    return measureSegment('loop', end, (t) => {
      const center = guide.point(start.progress * guide.perimeter + drift * t);
      return orbit(center, start.radii, start.angle + start.direction * TAU * beeTwoEase(t));
    });
  }

  const progress = random();
  const depth = random() * intensity;
  let segment = travelSegment({
    progress,
    depth,
    radii: randomRadii(),
    angle: loopAngle(progress, depth, initialDirection, initialGuideDirection),
    direction: initialDirection,
    guideDirection: initialGuideDirection,
  });
  let distanceInSegment = 0;

  // Motion uses distance; exploration uses active seconds. Omitting seconds
  // leaves the quadrant clock paused for distance-only geometry sampling.
  function advance(distance: number, seconds = 0): BeeTwoPose {
    distanceInSegment += Math.max(0, distance);
    while (distanceInSegment >= segment.lengths[segment.lengths.length - 1]) {
      distanceInSegment -= segment.lengths[segment.lengths.length - 1];
      if (
        targetQuadrant !== null &&
        segment.phase === 'travel' &&
        segment.nextPhase === 'loop' &&
        insideQuadrant(anchorPoint(segment.end), targetQuadrant)
      ) {
        targetQuadrant = null;
        quadrantSeconds.fill(0);
        // A new area gets its own local loop budget. Do not immediately U-turn
        // away from the destination before drawing a loop there.
        loopsUntilDirectionChange = nextDirectionChange();
      }
      // Finish the current curve smoothly, but do not start another local loop
      // while relocation is pending (including curves planned before the timeout).
      if (segment.nextPhase === 'loop' && targetQuadrant === null) {
        const entry = anchorPoint(segment.end);
        const quadrant = quadrantAt(entry);
        if (insideQuadrant(entry, quadrant)) lastVisited[quadrant] = activeSeconds;
        segment = loopSegment(segment.end);
        continue;
      }
      if (segment.phase === 'loop') loopsUntilDirectionChange--;
      segment = travelSegment(segment.end);
    }

    const { pointAt, lengths, phase } = segment;
    const sampleCount = lengths.length - 1;
    let low = 0;
    let high = sampleCount;
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (lengths[middle] <= distanceInSegment) low = middle;
      else high = middle;
    }
    const fraction = (distanceInSegment - lengths[low]) / (lengths[high] - lengths[low]);
    const t = (low + fraction) / sampleCount;
    const point = pointAt(t);
    trackQuadrants(point, seconds);
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
