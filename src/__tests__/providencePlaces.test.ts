import { describe, expect, it } from 'vitest';
import { Actor, blankWorld } from '../providence/Actor';
import { ABIGAIL, BALAAMS_DONKEY, JOBS_FRIENDS, UNJUST_JUDGE, WATCHING_FATHER } from '../providence/arcs2';
import { admit, comprehension, nearestRefuge, placeRefuges, type Point } from '../providence/places';
import type { WorldView } from '../providence/types';

const world = (over: Partial<Omit<WorldView, 'timeInNode'>> = {}): Omit<WorldView, 'timeInNode'> => ({
  ...blankWorld(),
  distanceToPlayer: 20,
  ...over,
});

function runUntil(actor: Actor, target: string, w: Partial<Omit<WorldView, 'timeInNode'>>, limit = 120): void {
  for (let t = 0; t < limit; t++) {
    if (actor.state === target) return;
    actor.update(1, world(w));
  }
  throw new Error(`"${actor.arc.id}" stalled in "${actor.state}" instead of reaching "${target}".`);
}

describe("Balaam's donkey — the mount that refuses", () => {
  it('overrides the rider rather than walking into danger', () => {
    const donkey = new Actor(BALAAMS_DONKEY);
    runUntil(donkey, 'refusing', { dangerAhead: true });
    expect(donkey.directive.overridesInput).toBe(true);
    expect(donkey.directive.move).toBe('hold');
  });

  it('carries on willingly once the danger is gone', () => {
    const donkey = new Actor(BALAAMS_DONKEY);
    runUntil(donkey, 'refusing', { dangerAhead: true });
    runUntil(donkey, 'carrying', { dangerAhead: false });
    expect(donkey.directive.overridesInput).toBeUndefined();
  });
});

describe('Abigail — the one who blocks an atrocity', () => {
  it('crosses the map to stand in the way, then stands down when it is averted', () => {
    const abigail = new Actor(ABIGAIL);
    runUntil(abigail, 'interposing', { atrocityImminent: true, distanceToPlayer: 1 });
    expect(abigail.directive.blocking).toBe(true);
    runUntil(abigail, 'averted', { atrocityImminent: false, distanceToPlayer: 1 });
    expect(abigail.directive.blocking).toBeUndefined();
  });
});

describe('The watching father — never pursues', () => {
  it('holds position indefinitely while the player stays away', () => {
    const father = new Actor(WATCHING_FATHER);
    for (let t = 0; t < 200; t++) father.update(1, world({ distanceToPlayer: 400 }));
    expect(father.state).toBe('watching');
    expect(father.directive.move).toBe('hold');
  });

  it('runs only when the player is already on the way back', () => {
    const father = new Actor(WATCHING_FATHER);
    runUntil(father, 'running', { playerReturning: true, distanceToPlayer: 40 });
    expect(father.directive.move).toBe('toward-player');
    runUntil(father, 'restoring', { playerReturning: true, distanceToPlayer: 1 });
    expect(father.directive.effectOnPlayer).toBe('comfort');
  });
});

describe('The unjust judge — yields to persistence, not to merit', () => {
  it('refuses forever if the player asks only a few times', () => {
    const judge = new Actor(UNJUST_JUDGE);
    for (let t = 0; t < 100; t++) judge.update(1, world({ requestsMade: 3 }));
    expect(judge.state).toBe('dismissive');
    expect(judge.directive.refusing).toBe(true);
  });

  it('grants once the asking has become wearisome', () => {
    const judge = new Actor(UNJUST_JUDGE);
    runUntil(judge, 'granting', { requestsMade: 6 });
    expect(judge.directive.refusing).toBeUndefined();
  });
});

describe("Job's friends — comfort while silent, harm once speaking", () => {
  it('helps only in the state where it says nothing', () => {
    const friends = new Actor(JOBS_FRIENDS);
    runUntil(friends, 'silent', { distanceToPlayer: 1, playerSuffering: true });
    expect(friends.directive.effectOnPlayer).toBe('comfort');

    runUntil(friends, 'speaking', { distanceToPlayer: 1, playerSuffering: true });
    expect(friends.directive.effectOnPlayer).toBe('harm');
  });
});

describe('Places — the tabernacle admits by what you are, not what you hold', () => {
  it('turns a bearer back to the deepest zone they qualify for, not out of the camp', () => {
    const verdict = admit({ id: 'p', qualities: ['clean'] }, 'lieu-tres-saint');
    expect(verdict.granted).toBe(false);
    expect(verdict.missing).toEqual(['consecrated', 'appointed']);
    expect(verdict.zone).toBe('parvis'); // not thrown out, only turned back
  });

  it('admits the qualified bearer and names its source', () => {
    const verdict = admit({ id: 'p', qualities: ['clean', 'consecrated', 'appointed'] }, 'lieu-tres-saint');
    expect(verdict.granted).toBe(true);
    expect(verdict.because).toBe('LEV.16.17');
  });

  it('enforces capacity: the innermost room holds exactly one', () => {
    const bearer = { id: 'p', qualities: ['clean', 'consecrated', 'appointed'] };
    const verdict = admit(bearer, 'lieu-tres-saint', { 'lieu-tres-saint': 1 });
    expect(verdict.granted).toBe(false);
    expect(verdict.missing).toEqual([]); // qualified, but the room is occupied
  });
});

describe('Places — refuge placement holds a travel-time guarantee', () => {
  const grid: Point[] = [];
  for (let x = 0; x <= 100; x += 10) for (let y = 0; y <= 100; y += 10) grid.push({ x, y });

  it('covers a territory better as more refuges are granted', () => {
    const three = placeRefuges(grid, 3);
    const six = placeRefuges(grid, 6);
    expect(six.worstDistance).toBeLessThan(three.worstDistance);
  });

  it('reports honestly whether the guarantee actually holds', () => {
    // measured, not assumed: six refuges cover this territory within 50
    const plan = placeRefuges(grid, 6, 50);
    expect(plan.guaranteeHeld).toBe(true);
    for (const s of grid) expect(nearestRefuge(s, plan.cities)).toBeLessThanOrEqual(50);

    // the flag must never flatter the plan
    const strict = placeRefuges(grid, 6, 20);
    expect(strict.guaranteeHeld).toBe(false);
    expect(strict.guaranteeHeld).toBe(strict.worstDistance <= 20);

    const tooFew = placeRefuges(grid, 1, 50);
    expect(tooFew.guaranteeHeld).toBe(false); // one city cannot cover the land
  });

  it('places the six cities the text asks for', () => {
    expect(placeRefuges(grid).cities).toHaveLength(6);
  });
});

describe('Places — Babel', () => {
  it('leaves speech intact below the threshold and dissolves it above', () => {
    expect(comprehension(50, 100)).toBe(1);
    expect(comprehension(150, 100)).toBeCloseTo(0.5);
    expect(comprehension(220, 100)).toBe(0);
  });
});
