import type { BeePoint } from '@/lib/shared/bee-animation';

type Heading = BeePoint & { angle: number };
type TravelSettings = {
  radius: number;
  minTurn: number;
  maxTurn: number;
  isSafe: (points: BeePoint[]) => boolean;
  isTarget: (point: BeePoint) => boolean;
  finish: (pose: Heading) => boolean;
};
const STEP = 0.25;
const angleDifference = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** Exactly two gradual turns, each followed by straight flight on its new heading. */
export function createBeeCourseChanges(
  start: Heading,
  distance: number,
  minTurn: number,
  maxTurn: number,
  random: () => number,
) {
  const legLength = distance / 2;
  const arcLength = legLength / 2;
  function leg(origin: Heading) {
    const degrees = minTurn + (maxTurn - minTurn) * random();
    const sign = random() < 0.5 ? -1 : 1;
    const turn = (degrees * sign * Math.PI) / 180;
    const angle = origin.angle + turn;
    function pointAt(t: number): Heading {
      const fraction = Math.min(1, t * 2);
      const swept = turn * fraction;
      let chord = arcLength * fraction;
      if (turn !== 0) chord = (2 * arcLength * Math.sin(swept / 2)) / turn;
      const hold = Math.max(0, t - 0.5) * legLength;
      return {
        x: origin.x + chord * Math.cos(origin.angle + swept / 2) + hold * Math.cos(angle),
        y: origin.y + chord * Math.sin(origin.angle + swept / 2) + hold * Math.sin(angle),
        angle: origin.angle + swept,
      };
    }
    // The tangent intersection encloses the complete circular arc.
    let handle = arcLength / 2;
    if (turn !== 0) handle = (arcLength * Math.tan(turn / 2)) / turn;
    const control = {
      x: origin.x + handle * Math.cos(origin.angle),
      y: origin.y + handle * Math.sin(origin.angle),
    };
    return {
      pointAt,
      end: pointAt(1),
      degrees: degrees * sign,
      controls: [origin, control, pointAt(0.5), pointAt(1)],
    };
  }
  const first = leg(start);
  const second = leg(first.end);
  return {
    end: second.end,
    turns: [first.degrees, second.degrees],
    controls: [...first.controls, ...second.controls],
    pointAt(t: number) {
      if (t < 0.5) return first.pointAt(t * 2);
      return second.pointAt((t - 0.5) * 2);
    },
  };
}

/** Heading-based quadrant travel; the old rectangular guide does not control this path. */
export function createBeeQuadrantTravel(
  start: Heading,
  goal: BeePoint,
  settings: TravelSettings,
  random: () => number,
): { points: BeePoint[]; turns: number[] } | null {
  const { radius, isSafe, isTarget, finish } = settings;
  const waypoints = [goal];
  if (!isSafe([start, goal])) {
    // One safe elbow is sufficient around the rectangular center exclusion.
    const elbows = [
      { x: start.x, y: goal.y },
      { x: goal.x, y: start.y },
    ];
    const elbow = elbows.find((point) => isSafe([start, point]) && isSafe([point, goal]));
    if (!elbow) return null;
    waypoints.unshift(elbow);
  }
  const points: BeePoint[] = [start];
  const tripLength = Math.hypot(goal.x - start.x, goal.y - start.y);
  let pose = start;
  let waypoint = 0;
  let travelled = 0;
  let nextAttempt = tripLength / 3;
  let turns: number[] = [];
  let holdDistance = 0;
  while (travelled < tripLength * 4 + radius * 20) {
    const target = waypoints[waypoint];
    const remaining = Math.hypot(target.x - pose.x, target.y - pose.y);
    if (waypoint < waypoints.length - 1 && remaining < radius * 2) {
      waypoint++;
      continue;
    }
    const bearing = Math.atan2(target.y - pose.y, target.x - pose.x);
    if (
      turns.length === 0 &&
      waypoint === waypoints.length - 1 &&
      travelled >= nextAttempt &&
      Math.abs(angleDifference(bearing - pose.angle)) < 0.035 &&
      remaining > radius * 3
    ) {
      nextAttempt = travelled + radius;
      // Reject unsafe proposals before committing, never clip or undo a turn.
      for (let attempt = 0; attempt < 8; attempt++) {
        const distance = remaining * 0.95;
        const course = createBeeCourseChanges(
          pose,
          distance,
          settings.minTurn,
          settings.maxTurn,
          random,
        );
        if (!isTarget(course.end) || !isSafe(course.controls)) continue;
        const samples = Math.ceil(distance / STEP);
        for (let index = 1; index <= samples; index++) points.push(course.pointAt(index / samples));
        pose = course.end;
        travelled += distance;
        turns = course.turns;
        break;
      }
    }
    if (turns.length > 0 && isTarget(pose) && finish(pose)) return { points, turns };
    // Once both turns are complete, hold the resulting heading until the smooth
    // loop-entry connector is ready. Do not steer back toward the original line.
    let change = 0;
    if (turns.length === 0)
      change = Math.max(
        -STEP / radius,
        Math.min(STEP / radius, angleDifference(bearing - pose.angle)),
      );
    const next = {
      x: pose.x + STEP * Math.cos(pose.angle + change / 2),
      y: pose.y + STEP * Math.sin(pose.angle + change / 2),
      angle: pose.angle + change,
    };
    if (!isSafe([pose, next])) return null;
    if (turns.length > 0) {
      holdDistance += STEP;
      if (holdDistance > radius * 4) return null;
    }
    pose = next;
    points.push(pose);
    travelled += STEP;
  }
  return null;
}
