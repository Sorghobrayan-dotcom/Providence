import { describe, expect, it } from 'vitest';

import { STRAIGHT, WAYS, evading, headingFor, spaceFor, wayFor } from '../providence/ways';

/**
 * The shape of the line, not the destination.
 *
 * Two things have to hold at once and they pull against each other: the way has
 * to bend the path enough to be seen, and it must never stop the creature
 * arriving. A weave that reads beautifully and orbits forever is a bug that
 * looks like a feature.
 */

/** What the movement code actually runs at: 0.16 units/s across an 18m field. */
const SPEED = 2.88;

/**
 * Walk a creature at a target and report what the path did.
 *
 * This is the only honest way to calibrate a heading offset. Radians say
 * nothing about whether a weave is visible; metres of cross-track displacement
 * do, and they are what the camera sees.
 */
function walk(way = STRAIGHT, fromMetres = 15, seconds = 12, dt = 1 / 60) {
  let x = 0;
  let y = 0;
  let widest = 0;
  let t = 0;

  while (t < seconds) {
    const dx = fromMetres - x;
    const gap = Math.hypot(dx, -y);
    if (gap < 0.3) break;

    const heading = headingFor(way, Math.atan2(-y, dx), t, gap);
    x += Math.cos(heading) * SPEED * dt;
    y += Math.sin(heading) * SPEED * dt;
    widest = Math.max(widest, Math.abs(y));
    t += dt;
  }

  return { widest, arrived: Math.hypot(fromMetres - x, y) < 0.5, took: t, endedAt: { x, y } };
}

describe('the default is a straight line', () => {
  it('returns the desired heading untouched', () => {
    for (const desired of [0, 1.2, -2.5, Math.PI]) {
      expect(headingFor(STRAIGHT, desired, 3.7, 9)).toBe(desired);
    }
  });

  it('gives an unnamed arc no opinion at all', () => {
    expect(wayFor('ruth')).toBe(STRAIGHT);
    expect(wayFor('no-such-arc')).toBe(STRAIGHT);
  });

  it('keeps the table sparse, so a bent path still means something', () => {
    expect(Object.keys(WAYS).length).toBeLessThan(8);
  });

  it('walks dead straight, which is the baseline everything else is read against', () => {
    const path = walk(STRAIGHT);
    expect(path.widest).toBeLessThan(0.001);
    expect(path.arrived).toBe(true);
  });
});

describe('calibration, in metres rather than radians', () => {
  /*
   * The number that matters is how far off the line a body actually travels.
   * The swing was set from v·A/2πf against the real movement speed, and this is
   * the check that the arithmetic survives contact with the loop.
   */
  it('weaves about a body width either side for the serpent', () => {
    const path = walk(WAYS['serpent']);
    expect(path.widest).toBeGreaterThan(0.5);
    expect(path.widest).toBeLessThan(3);
  });

  it('bends the tempter\'s path wider still, and more slowly', () => {
    const serpent = walk(WAYS['serpent']);
    const tempter = walk(WAYS['tempter']);
    // he repositions rather than weaves: fewer, larger departures
    expect(tempter.widest).toBeGreaterThan(serpent.widest);
  });

  it('leaves the giant on a rail', () => {
    expect(walk(WAYS['goliath']).widest).toBeLessThan(0.001);
  });
});

describe('a bent path still has to arrive', () => {
  it('gets the serpent there despite the weave', () => {
    const path = walk(WAYS['serpent']);
    expect(path.arrived).toBe(true);
  });

  it('gets every named way there', () => {
    for (const [id, way] of Object.entries(WAYS)) {
      expect(walk(way, 15, 30).arrived, id).toBe(true);
    }
  });

  it('costs the serpent time rather than accuracy', () => {
    // the weave should be a longer route, not a failed one
    expect(walk(WAYS['serpent']).took).toBeGreaterThan(walk(STRAIGHT).took);
  });
});

describe('settling', () => {
  it('straightens out as it closes, so it arrives instead of orbiting', () => {
    const serpent = WAYS['serpent']!;
    const far = Math.abs(headingFor(serpent, 0, 0.8, 14));
    const near = Math.abs(headingFor(serpent, 0, 0.8, 0.3));
    expect(near).toBeLessThan(far * 0.4);
  });

  it('lets a way keep most of its character to the end when it should', () => {
    // the ass does not straighten up because she was asked firmly
    const donkey = WAYS['balaams-donkey']!;
    const far = Math.abs(headingFor(donkey, 0, 0.4, 14));
    const near = Math.abs(headingFor(donkey, 0, 0.4, 0.3));
    expect(near).toBeGreaterThan(far * 0.7);
  });
});

describe('veer is one-sided and swing is not', () => {
  it('sends the ass off the road and keeps her there', () => {
    const donkey = WAYS['balaams-donkey']!;
    const samples = Array.from({ length: 40 }, (_, i) => headingFor(donkey, 0, i * 0.25, 20));
    // every sample on the same side: she does not weave back
    expect(samples.every((s) => s > 0)).toBe(true);
  });

  it('sends the serpent to both sides of the line', () => {
    const serpent = WAYS['serpent']!;
    const samples = Array.from({ length: 60 }, (_, i) => headingFor(serpent, 0, i * 0.25, 20));
    expect(Math.max(...samples)).toBeGreaterThan(0);
    expect(Math.min(...samples)).toBeLessThan(0);
  });
});

describe('personal space', () => {
  it('leaves the decision to Bearing for anyone with no opinion', () => {
    expect(spaceFor(STRAIGHT, 2.4)).toBe(2.4);
    expect(spaceFor(WAYS['serpent']!, 2.4)).toBe(2.4);
  });

  it('lets the giant walk through the distance a stranger would keep', () => {
    expect(spaceFor(WAYS['goliath']!, 2.95)).toBe(0.55);
    expect(spaceFor(WAYS['goliath']!, 2.95)).toBeLessThan(2.95);
  });
});

describe('it refuses to produce nonsense', () => {
  it('falls back to the desired heading on a distance that is not a number', () => {
    expect(headingFor(WAYS['serpent']!, 1.1, 2, Number.NaN)).toBe(1.1);
    expect(headingFor(WAYS['serpent']!, 1.1, Number.NaN, 5)).toBe(1.1);
  });

  it('never swings a body more than a right angle off its own goal', () => {
    for (const [id, way] of Object.entries(WAYS)) {
      for (let t = 0; t < 40; t += 0.13) {
        const off = Math.abs(headingFor(way, 0, t, 20));
        expect(off, `${id} at ${t.toFixed(2)}s`).toBeLessThan(Math.PI / 2);
      }
    }
  });

  it('names a passage for every way, so none of it is invented movement', () => {
    for (const [id, way] of Object.entries({ ...WAYS, straight: STRAIGHT })) {
      expect(way.source, id).toMatch(/^[A-Z0-9]{3}\.\d+\.\d+$/);
      expect(way.note.length, id).toBeGreaterThan(20);
    }
  });
});

/**
 * Leaving, as opposed to pointing away.
 *
 * `away-from-player` was computed as a mirror: reflect the player through the
 * body and walk at the reflection. In open ground that is fine and it is exactly
 * wrong at a boundary, because the mirror keeps pointing into the wall, the
 * body clamps against it, and whoever is following strolls up to a man who is
 * running as hard as he can. Everything the arcs say about Jonah is undone by
 * that one line: he does not flee, he parks in a corner.
 */
describe('leaving, as opposed to pointing away', () => {
  const FIELD = { minX: 0.04, maxX: 0.96, minY: 0.06, maxY: 0.94 };
  const SPEED = 0.02;
  const MARGIN = 0.06;

  const mirror = (at: { x: number; y: number }, after: { x: number; y: number }): number =>
    Math.atan2(at.y - after.y, at.x - after.x);

  /**
   * A pursuer that walks straight at him, at exactly his own speed, from a
   * corner. Same speed on purpose: nobody should be caught, so being caught can
   * only mean the ground was used against him.
   */
  function chase(
    pick: (at: { x: number; y: number }, after: { x: number; y: number }) => number,
    ticks = 600,
    start: { x: number; y: number } = { x: 0.06, y: 0.08 },
    from: { x: number; y: number } = { x: 0.34, y: 0.30 },
  ) {
    let at = { ...start };
    let after = { ...from };
    let closest = Infinity;
    let pinned = 0;
    let worstPin = 0;
    let travelled = 0;
    let caughtAt = -1;

    for (let t = 0; t < ticks; t += 1) {
      const heading = pick(at, after);
      const x = Math.max(FIELD.minX, Math.min(FIELD.maxX, at.x + Math.cos(heading) * SPEED));
      const y = Math.max(FIELD.minY, Math.min(FIELD.maxY, at.y + Math.sin(heading) * SPEED));
      travelled += Math.hypot(x - at.x, y - at.y);
      at = { x, y };

      const toward = Math.atan2(at.y - after.y, at.x - after.x);
      after = { x: after.x + Math.cos(toward) * SPEED, y: after.y + Math.sin(toward) * SPEED };

      const gap = Math.hypot(at.x - after.x, at.y - after.y);
      closest = Math.min(closest, gap);
      if (caughtAt < 0 && gap < 0.04) caughtAt = t;

      const room = Math.min(at.x - FIELD.minX, FIELD.maxX - at.x, at.y - FIELD.minY, FIELD.maxY - at.y);
      pinned = room < 1e-6 ? pinned + 1 : 0;
      worstPin = Math.max(worstPin, pinned);
    }
    return { closest, worstPin, travelled, caughtAt };
  }

  /* What is NOT claimed here, because it is not true: that he cannot be caught.
     A pursuer of equal speed running straight at him always closes eventually
     inside a bounded field, and the editor's player is dragged by a mouse and so
     has no speed limit at all. The defect was never that he lost the race. It
     was that he stopped running. */

  it('is held against a wall by the mirror, motionless, until collected', () => {
    const run = chase(mirror, 3000);
    expect(run.worstPin).toBeGreaterThan(2000);
    expect(run.closest).toBeLessThan(0.05);
  });

  it('never stops, and never spends a single tick pinned', () => {
    const run = chase((at, after) => evading(at, after, FIELD, MARGIN), 3000);
    expect(run.worstPin).toBe(0);
    // full speed on every tick of the run, rather than grinding against a wall
    expect(run.travelled).toBeCloseTo(3000 * SPEED, 5);
  });

  it('buys real time against the same pursuer, from the open ground', () => {
    const from = { x: 0.5, y: 0.5 };
    const behind = { x: 0.75, y: 0.5 };
    const pinned = chase(mirror, 3000, from, behind).caughtAt;
    const slipped = chase((at, after) => evading(at, after, FIELD, MARGIN), 3000, from, behind).caughtAt;

    // both start by running dead away; the difference is what the wall does
    expect(pinned).toBeGreaterThan(0);
    expect(slipped).toBeGreaterThan(pinned * 1.3);
  });

  it('goes straight away when there is nothing in the way, so nothing else changes', () => {
    const at = { x: 0.5, y: 0.5 };
    const after = { x: 0.3, y: 0.5 };
    expect(evading(at, after, FIELD, MARGIN)).toBeCloseTo(mirror(at, after), 6);
  });

  it('turns rather than walks into the edge it is backed against', () => {
    const at = { x: 0.05, y: 0.5 };
    const after = { x: 0.2, y: 0.5 };
    const heading = evading(at, after, FIELD, MARGIN);
    // the mirror here is due west, straight into the wall he is already on
    expect(Math.cos(heading)).toBeGreaterThan(Math.cos(mirror(at, after)));
    expect(at.x + Math.cos(heading) * MARGIN).toBeGreaterThanOrEqual(FIELD.minX);
  });
});
