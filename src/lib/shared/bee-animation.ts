export type BeePoint = { x: number; y: number };
export type BeeTrailPoint = BeePoint & { time: number };
export type BeeTurnDirection = -1 | 1;

export type BeeRoute = {
  loopWidth: number;
  loopHeight: number;
  coils: { scale: number; height: number }[];
};

type BeeCrossing = {
  points: BeePoint[];
  distances: number[];
  length: number;
};

export type BeeFlightPath = {
  width: number;
  height: number;
  crossings: Record<BeeTurnDirection, BeeCrossing>;
};

// 1 = compact coils; 2 = roomier coils. Keep at least 1 to avoid pinched curls.
// Width is limited by coil spacing, not the entire viewport.
const LOOP_SIZE = 2;
const LOOP_SIZE_VARIATION = 0.8;
const LOOPS_PER_CROSSING = 3; // Any positive integer.
const VIEWPORT_PADDING_PX = 24;
const EDGE_MARGIN = 0.03;
const EDGE_TURN_RADIUS = 0.12;
const MOBILE_VIEWPORT_WIDTH = 640;
// Narrow screens need steadier bends, so vary the turn point less there.
// Staying below 1 keeps the connector's end speed nonzero; exactly 1 would
// momentarily stop the bee where each connector meets the next coil.
const HANDLE_JITTER_MIN = 0.55;
const HANDLE_JITTER_MAX = 0.95;
const HANDLE_JITTER_MIN_MOBILE = 0.7;
const HANDLE_JITTER_MAX_MOBILE = 0.9;
// Narrow screens cannot fit a full-height swing between neighboring coils
// without whipping the bee's heading, so cap each vertical rise there.
const MOBILE_MAX_COIL_RISE = 0.4;
const SAMPLES_PER_SECTION = 512;
const TAU = Math.PI * 2;

export function createBeeRoute(loopSize = LOOP_SIZE, loopCount = LOOPS_PER_CROSSING): BeeRoute {
  if (!Number.isInteger(loopCount) || loopCount < 1) {
    throw new RangeError('LOOPS_PER_CROSSING must be a positive integer');
  }
  const size = Math.max(1, loopSize);
  const startSmall = Math.random() < 0.5;
  const coils = Array.from({ length: loopCount }, (_, index) => {
    const small = (index % 2 === 0) === startSmall;
    const upper = Math.random() < 0.5;
    const scaleMin = small ? 1 - LOOP_SIZE_VARIATION : 1 - LOOP_SIZE_VARIATION * 0.25;
    const scaleRange = small ? LOOP_SIZE_VARIATION * 0.375 : LOOP_SIZE_VARIATION * 0.25;
    const heightMin = upper ? 0 : 0.92;
    return {
      scale: scaleMin + Math.random() * scaleRange,
      height: heightMin + Math.random() * 0.08,
    };
  });
  return {
    loopWidth: Math.min(0.5 / loopCount, 0.16 * size),
    loopHeight: Math.min(0.19, 0.09 * size),
    coils,
  };
}

/** Build for each new crossing or resize, never per frame. */
export function createBeeFlightPath(
  width: number,
  height: number,
  route: BeeRoute,
  padding: number = VIEWPORT_PADDING_PX,
): BeeFlightPath {
  const insetX = Math.min(padding, width / 2);
  const insetY = Math.min(padding, height / 2);
  const usableWidth = Math.max(0, width - 2 * insetX) * (1 - 2 * EDGE_MARGIN);
  // The supplied height starts at the measured header bottom. Use all of it,
  // apart from icon padding, rather than adding another percentage-sized gap.
  const usableHeight = Math.max(0, height - 2 * insetY);
  const shortSide = Math.min(usableWidth, usableHeight);
  const turnRadius = shortSide * EDGE_TURN_RADIUS;
  const left = (width - usableWidth) / 2;
  const centerY = height / 2;
  const startX = left + turnRadius;
  const endX = width - startX;
  const travelWidth = endX - startX;
  const baselineY = centerY + turnRadius;
  const loopCount = route.coils.length;
  if (loopCount === 0) throw new RangeError('A bee route must contain at least one coil');
  const spacing = travelWidth / loopCount;
  // Use the shorter viewport dimension so wide screens don't flatten the
  // coils into hairpins. Spacing limits prevent adjacent coils merging.
  const maxRadiusX = Math.min(shortSide * route.loopWidth, spacing * 0.34);
  const maxRadiusY = Math.min(shortSide * route.loopHeight, usableHeight * 0.24);
  const top = (height - usableHeight) / 2;

  function buildCrossing(direction: BeeTurnDirection): BeeCrossing {
    const points: BeePoint[] = [{ x: left, y: centerY }];
    const distances = [0];
    let length = 0;

    function appendSection(pointAt: (progress: number) => BeePoint) {
      for (let index = 1; index <= SAMPLES_PER_SECTION; index++) {
        const point = pointAt(index / SAMPLES_PER_SECTION);
        const previous = points[points.length - 1];
        length += Math.hypot(point.x - previous.x, point.y - previous.y);
        points.push(point);
        distances.push(length);
      }
    }

    function connect(from: BeePoint, to: BeePoint) {
      // Horizontal handles match the coil tangents while allowing broad
      // vertical travel. All control points remain inside the viewport.
      const isMobile = width < MOBILE_VIEWPORT_WIDTH;
      const jitterMin = isMobile ? HANDLE_JITTER_MIN_MOBILE : HANDLE_JITTER_MIN;
      const jitterMax = isMobile ? HANDLE_JITTER_MAX_MOBILE : HANDLE_JITTER_MAX;
      const jitter = jitterMin + Math.random() * (jitterMax - jitterMin);
      const dx = to.x - from.x;
      const steepness = Math.min(1, Math.abs(to.y - from.y) / Math.max(1, dx));
      const handle = dx * (0.5 + 0.5 * steepness) * jitter;
      appendSection((t) => ({
        x:
          (1 - t) ** 3 * from.x +
          3 * (1 - t) ** 2 * t * (from.x + handle) +
          3 * (1 - t) * t ** 2 * (to.x - handle) +
          t ** 3 * to.x,
        y: from.y + (to.y - from.y) * t ** 2 * (3 - 2 * t),
      }));
    }

    // Circular edge turns, curved connectors, and drifting coils all meet
    // with matching tangent directions. Timing comes only from arc length.
    appendSection((t) => ({
      x: startX - turnRadius * Math.cos((t * Math.PI) / 2),
      y: centerY + turnRadius * Math.sin((t * Math.PI) / 2),
    }));
    let cursor = { x: startX, y: baselineY };
    let lastCoilY = baselineY;
    for (let index = 0; index < loopCount; index++) {
      const coil = route.coils[index];
      // Vary AFTER fitting the base radius, otherwise the size-2 caps erase
      // the variation and every loop ends up the same size.
      const radiusX = maxRadiusX * coil.scale;
      const radiusY = maxRadiusY * coil.scale;
      const coilDrift = radiusX * 0.6;
      const rawCenterY = top + radiusY + (usableHeight - 2 * radiusY) * coil.height;
      // A full-height cap leaves desktop swings untouched while keeping
      // narrow-screen connectors gently sloped instead of near-vertical.
      const maxRise = usableHeight * (width < MOBILE_VIEWPORT_WIDTH ? MOBILE_MAX_COIL_RISE : 1);
      const centerY = Math.max(Math.min(rawCenterY, lastCoilY + maxRise), lastCoilY - maxRise);
      lastCoilY = centerY;
      const coilStart = {
        x: startX + (index + 0.45 + Math.random() * 0.3) * spacing - coilDrift / 2,
        y: centerY - direction * radiusY,
      };
      connect(cursor, coilStart);
      appendSection((t) => ({
        x: coilStart.x + coilDrift * t + radiusX * Math.sin(TAU * t),
        y: coilStart.y + direction * radiusY * (1 - Math.cos(TAU * t)),
      }));
      cursor = { x: coilStart.x + coilDrift, y: coilStart.y };
    }
    connect(cursor, { x: endX, y: baselineY });
    appendSection((t) => ({
      x: endX + turnRadius * Math.sin((t * Math.PI) / 2),
      y: centerY + turnRadius * Math.cos((t * Math.PI) / 2),
    }));
    return { points, distances, length };
  }

  return {
    width,
    height,
    crossings: { '-1': buildCrossing(-1), '1': buildCrossing(1) },
  };
}

/** Progress measures distance, not the curve's uneven geometric parameter. */
export function getBeePosition(
  progress: number,
  path: BeeFlightPath,
  turnDirection: BeeTurnDirection = 1,
): BeePoint {
  const cycle = ((progress % 1) + 1) % 1;
  const returning = cycle >= 0.5;
  const crossing = path.crossings[turnDirection];
  const distance = ((cycle * 2) % 1) * crossing.length;
  let low = 1;
  let high = crossing.distances.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (crossing.distances[middle] < distance) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  const start = crossing.points[low - 1];
  const end = crossing.points[low];
  const segmentLength = crossing.distances[low] - crossing.distances[low - 1];
  let fraction = 0;
  if (segmentLength > 0) fraction = (distance - crossing.distances[low - 1]) / segmentLength;
  const x = start.x + (end.x - start.x) * fraction;
  const y = start.y + (end.y - start.y) * fraction;
  if (returning) return { x: path.width - x, y: path.height - y };
  return { x, y };
}

export function getTrailOpacity(time: number, now: number, lifetime: number): number {
  return Math.max(0, Math.min(1, 1 - (now - time) / lifetime));
}

export function pruneBeeTrail(
  points: BeeTrailPoint[],
  now: number,
  lifetime: number,
): BeeTrailPoint[] {
  return points.filter((point) => now - point.time < lifetime);
}
