import type { Directive, Disposition } from '../providence/types';
import { evading, headingFor, spaceFor, type Field, type Way } from '../providence/ways';
import { approachFor, paceFor } from './Bearing';

/**
 * Where the body goes this frame.
 *
 * The library decides the destination and nothing here argues with it. What is
 * decided here is the rest: how fast, on what line, how close it is willing to
 * get, and what happens when the ground runs out. That is four separate pieces
 * of arithmetic and all four of them have been wrong at some point, which is the
 * argument for it living somewhere it can be asserted rather than in a frame
 * loop nobody can call twice.
 *
 * Every bug this file has ever had was invisible on the page. Distances were
 * read in normalised units against a library that thinks in metres, so a wary
 * stranger stopping 2.95 m away read as 6.5 to the arcs and every node gated at
 * `distanceToPlayer < 3` became unreachable — characters simply could not be
 * approached closely enough to answer. Bodies walked to each other's exact
 * coordinates and rendered as one figure. And fleeing was a mirror, which points
 * into the wall behind a cornered man and holds him there.
 *
 * Pure: it takes where things are and returns where the body should now be.
 */

/** Units of the 0..1 field crossed per second at an ordinary walk. */
export const PACE = 0.16;

export interface Spot {
  readonly x: number;
  readonly y: number;
}

export interface Scene {
  readonly at: Spot;
  readonly player: Spot;
  readonly errand: Spot;
  readonly field: Field;
  /** Metres across one unit, so distances can be reasoned about in metres. */
  readonly metresPerUnit: number;
  /** How far ahead a fleeing body looks for the wall, in units. */
  readonly lookahead: number;
}

const held = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));

const inside = (spot: Spot, field: Field): Spot => ({
  x: held(spot.x, field.minX, field.maxX),
  y: held(spot.y, field.minY, field.maxY),
});

/**
 * Advance the body by one tick, and return where it now is.
 *
 * `way` bends the line taken toward something. It is deliberately not consulted
 * while fleeing: a way is a manner of arriving, and `evading` is already
 * choosing the heading for a body whose whole problem is that it does not want
 * to arrive anywhere.
 */
export function stepped(
  directive: Directive,
  disposition: Disposition,
  way: Way,
  scene: Scene,
  dtSeconds: number,
  clock: number,
): Spot {
  const speed = PACE * dtSeconds * paceFor(disposition, directive.move, clock);
  const { at, field } = scene;

  if (directive.move === 'away-from-player' || directive.move === 'away-from-errand') {
    const after = directive.move === 'away-from-player' ? scene.player : scene.errand;
    const heading = evading(at, after, field, scene.lookahead);
    return inside(
      { x: at.x + Math.cos(heading) * speed, y: at.y + Math.sin(heading) * speed },
      field,
    );
  }

  const target =
    directive.move === 'toward-player' ? scene.player :
    directive.move === 'toward-errand' ? scene.errand :
    null;

  if (!target) return at;

  const dx = target.x - at.x;
  const dy = target.y - at.y;
  const gap = Math.hypot(dx, dy);
  if (gap < 1e-6) return at;

  /* Stop at arm's length rather than at the other body's exact coordinates.
     How far out is the character's business: a companion who trusts you comes
     to your shoulder, one who does not keeps the length of a room — and the
     handful of creatures whose whole point is that they ignore personal space
     override it in `ways`. In metres, converted here, because a personal space
     measured in normalised units is one nobody can reason about. */
  const keep = spaceFor(way, approachFor(disposition, directive.move)) / scene.metresPerUnit;
  const step = Math.min(speed, Math.max(0, gap - keep));
  if (step <= 0) return at;

  const heading = headingFor(way, Math.atan2(dy, dx), clock, gap * scene.metresPerUnit);
  return inside(
    { x: at.x + Math.cos(heading) * step, y: at.y + Math.sin(heading) * step },
    field,
  );
}
