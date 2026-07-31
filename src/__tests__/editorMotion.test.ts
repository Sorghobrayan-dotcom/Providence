import { describe, expect, it } from 'vitest';

import { PACE, stepped, type Scene, type Spot } from '../editor/Motion';
import { STRAIGHT, WAYS } from '../providence/ways';
import type { Directive, Disposition } from '../providence/types';

/**
 * The four pieces of arithmetic between a directive and a body on screen.
 *
 * All four have been wrong at some point and not one of the failures was
 * visible as a failure. Distances were read in normalised units against a
 * library that thinks in metres, so every node gated at three metres was
 * unreachable and characters simply would not answer. Two bodies walked to the
 * same coordinates and rendered as one figure. Fleeing was a mirror, which
 * points into the wall behind a cornered man and pins him there. This file is
 * the net that was never under any of it.
 */

/** The editor's own ground and scale. */
const FIELD = { minX: 0.04, maxX: 0.96, minY: 0.06, maxY: 0.94 };
const METRES_PER_UNIT = 18;

const scene = (over: Partial<Scene> = {}): Scene => ({
  at: { x: 0.3, y: 0.5 },
  player: { x: 0.7, y: 0.5 },
  errand: { x: 0.845, y: 0.24 },
  field: FIELD,
  metresPerUnit: METRES_PER_UNIT,
  lookahead: 0.11,
  ...over,
});

const composed: Disposition = { trust: 0.9, fear: 0, resolve: 1 };
const move = (m: Directive['move'], posture = 'walking'): Directive => ({ move: m, posture });

const apart = (a: Spot, b: Spot): number => Math.hypot(a.x - b.x, a.y - b.y) * METRES_PER_UNIT;

/** Walk a body for `seconds` at sixty ticks a second, against a still scene. */
function walk(directive: Directive, disposition = composed, way = STRAIGHT, seconds = 12, start?: Spot) {
  let at = start ?? { x: 0.3, y: 0.5 };
  const dt = 1 / 60;
  let widest = 0;
  let stalled = 0;
  let worstStall = 0;

  for (let t = 0; t < seconds; t += dt) {
    const next = stepped(directive, disposition, way, scene({ at }), dt, t);
    const gone = Math.hypot(next.x - at.x, next.y - at.y);
    stalled = gone < 1e-9 ? stalled + 1 : 0;
    worstStall = Math.max(worstStall, stalled);
    widest = Math.max(widest, Math.abs(next.y - 0.5));
    at = next;
  }
  return { at, widest, worstStall };
}

describe('holding still is holding still', () => {
  it('does not drift on a hold, at any disposition', () => {
    const at = { x: 0.3, y: 0.5 };
    for (const fear of [0, 0.5, 1]) {
      const next = stepped(move('hold'), { trust: 0.5, fear, resolve: 0.5 }, STRAIGHT, scene({ at }), 1 / 60, 3);
      expect(next).toEqual(at);
    }
  });
});

describe('approaching stops at arm\'s length, in metres', () => {
  it('closes on the player and then stops, without walking through him', () => {
    const { at } = walk(move('toward-player'));
    const gap = apart(at, scene().player);
    expect(gap).toBeGreaterThan(0.9);
    expect(gap).toBeLessThan(3.2);
  });

  it('keeps a room between you when it does not trust you, and a shoulder when it does', () => {
    const trusting = apart(walk(move('toward-player'), { trust: 1, fear: 0, resolve: 1 }).at, scene().player);
    const wary = apart(walk(move('toward-player'), { trust: 0, fear: 0, resolve: 1 }).at, scene().player);

    expect(wary).toBeGreaterThan(trusting);
    /* And the wary one still has to be reachable. This is the scale bug: the
       arcs open nodes at `distanceToPlayer < 3`, and a personal space that
       computes to more than that makes them unreachable by construction —
       which is exactly how it felt, and it read as characters ignoring you. */
    expect(wary).toBeLessThan(3);
  });

  it('lets the giant walk through the distance a stranger would keep', () => {
    const stranger = apart(walk(move('toward-player'), { trust: 0, fear: 0, resolve: 1 }).at, scene().player);
    const giant = apart(walk(move('toward-player'), { trust: 0, fear: 0, resolve: 1 }, WAYS['goliath']).at, scene().player);
    expect(giant).toBeLessThan(stranger);
    expect(giant).toBeLessThan(1);
  });

  it('arrives at the errand rather than orbiting it', () => {
    const { at } = walk(move('toward-errand'), composed, STRAIGHT, 20);
    expect(apart(at, scene().errand)).toBeLessThan(1);
  });
});

describe('the way bends the line without stopping it arriving', () => {
  it('weaves the serpent off the straight line', () => {
    expect(walk(move('toward-player'), composed, WAYS['serpent']).widest)
      .toBeGreaterThan(walk(move('toward-player')).widest);
  });

  it('gets the serpent there anyway', () => {
    const { at } = walk(move('toward-player'), composed, WAYS['serpent'], 20);
    expect(apart(at, scene().player)).toBeLessThan(3.5);
  });

  it('does not bend a flight, because a way is a manner of arriving', () => {
    const straight = walk(move('away-from-player'), composed, STRAIGHT, 3);
    const serpentine = walk(move('away-from-player'), composed, WAYS['serpent'], 3);
    expect(serpentine.at).toEqual(straight.at);
  });
});

describe('fleeing means leaving', () => {
  it('never leaves the ground', () => {
    for (const start of [{ x: 0.05, y: 0.07 }, { x: 0.95, y: 0.93 }, { x: 0.5, y: 0.5 }]) {
      const { at } = walk(move('away-from-player'), composed, STRAIGHT, 30, start);
      expect(at.x).toBeGreaterThanOrEqual(FIELD.minX);
      expect(at.x).toBeLessThanOrEqual(FIELD.maxX);
      expect(at.y).toBeGreaterThanOrEqual(FIELD.minY);
      expect(at.y).toBeLessThanOrEqual(FIELD.maxY);
    }
  });

  it('never stops moving, which is the whole of what the mirror got wrong', () => {
    // started in the corner the mirror used to park him in
    expect(walk(move('away-from-player'), composed, STRAIGHT, 30, { x: 0.05, y: 0.07 }).worstStall).toBe(0);
  });

  it('runs from the errand as readily as from the player', () => {
    const before = { x: 0.6, y: 0.35 };
    const { at } = walk(move('away-from-errand'), composed, STRAIGHT, 4, before);
    expect(apart(at, scene().errand)).toBeGreaterThan(apart(before, scene().errand));
  });
});

describe('what the body feels shows in how fast it goes, and only that', () => {
  it('sends a terrified man away faster than a calm one', () => {
    const calm = walk(move('away-from-player'), { trust: 0.5, fear: 0, resolve: 1 }, STRAIGHT, 2);
    const afraid = walk(move('away-from-player'), { trust: 0.5, fear: 1, resolve: 1 }, STRAIGHT, 2);
    expect(apart(afraid.at, scene().player)).toBeGreaterThan(apart(calm.at, scene().player));
  });

  it('does not let a disposition change where it is going', () => {
    // both end up further from the player; neither ends up somewhere else
    for (const fear of [0, 1]) {
      const { at } = walk(move('away-from-player'), { trust: 0.5, fear, resolve: 1 }, STRAIGHT, 2);
      expect(at.x).toBeLessThan(0.3);
    }
  });
});

describe('the same behaviour at any frame rate', () => {
  it('covers the same ground in sixty small steps as in one large one', () => {
    const scene1 = scene({ at: { x: 0.3, y: 0.5 } });
    const big = stepped(move('toward-errand'), composed, STRAIGHT, scene1, 1, 0);

    let at = scene1.at;
    for (let i = 0; i < 60; i += 1) {
      at = stepped(move('toward-errand'), composed, STRAIGHT, scene({ at }), 1 / 60, 0);
    }

    expect(at.x).toBeCloseTo(big.x, 3);
    expect(at.y).toBeCloseTo(big.y, 3);
  });

  it('walks at the stated pace when nothing is hurrying it', () => {
    const at = stepped(move('toward-errand'), composed, STRAIGHT, scene({ at: { x: 0.3, y: 0.5 } }), 1, 0);
    expect(Math.hypot(at.x - 0.3, at.y - 0.5)).toBeCloseTo(PACE, 3);
  });
});
