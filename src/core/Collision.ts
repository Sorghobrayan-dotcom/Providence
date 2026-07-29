import { Vector2 } from './Vector2';

export interface Circle {
  readonly position: Vector2;
  readonly radius: number;
}

export function circlesIntersect(a: Circle, b: Circle): boolean {
  const radiusSum = a.radius + b.radius;
  return a.position.distanceTo(b.position) <= radiusSum;
}

/** True when `target` is within `range` of `origin` and inside `arcRadians` of `facing`. */
export function isWithinFacingArc(
  origin: Vector2,
  facing: Vector2,
  target: Vector2,
  range: number,
  arcRadians: number,
): boolean {
  const toTarget = target.sub(origin);
  const distance = toTarget.length();
  if (distance > range) return false;
  if (distance === 0) return true;
  const facingAngle = facing.angle();
  const targetAngle = toTarget.angle();
  let delta = Math.abs(facingAngle - targetAngle);
  if (delta > Math.PI) delta = Math.PI * 2 - delta;
  return delta <= arcRadians / 2;
}
