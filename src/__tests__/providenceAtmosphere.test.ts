import { describe, expect, it } from 'vitest';
import { Actor, blankWorld } from '../providence/Actor';
import { BALAAMS_DONKEY } from '../providence/arcs2';
import { PETER } from '../providence/arcs';
import { DREAD, NOWHERE, TEMPLE, ATMOSPHERES } from '../providence/atmosphere';
import type { WorldView } from '../providence/types';

/**
 * A place has to reach every arc, not only the three built on drives. It does
 * that by pressing on the disposition, which all of them read. So a frightening
 * room frightens Peter and the donkey alike, and neither arc has ever heard of
 * atmospheres.
 */

const quiet = (over: Partial<Omit<WorldView, 'timeInNode'>> = {}) => ({
  ...blankWorld(),
  distanceToPlayer: 3,
  ...over,
});

function stand(actor: Actor, seconds: number, over: Partial<Omit<WorldView, 'timeInNode'>> = {}): void {
  for (let t = 0; t < seconds; t++) actor.update(1, quiet(over));
}

describe('the donkey reads the room, not a flag', () => {
  it('carries on happily where nothing presses', () => {
    const donkey = new Actor(BALAAMS_DONKEY);
    donkey.standsIn(NOWHERE);
    stand(donkey, 60, { errand: 'the-road' });
    expect(donkey.state).toBe('carrying');
    expect(donkey.directive.overridesInput).toBeUndefined();
  });

  it('balks and then lies down in a frightening place, with no danger shown to it', () => {
    const donkey = new Actor(BALAAMS_DONKEY);
    donkey.standsIn(DREAD);

    // dangerAhead is false throughout: the room alone does this
    stand(donkey, 12, { errand: 'the-road', dangerAhead: false });
    expect(donkey.state).toBe('refusing');
    expect(donkey.directive.overridesInput).toBe(true);
    expect(donkey.journal.map((e) => e.note)).toContain('elle sent le lieu, et refuse d avancer');
  });

  it('gets up again once it is taken somewhere calm', () => {
    const donkey = new Actor(BALAAMS_DONKEY);
    donkey.standsIn(DREAD);
    stand(donkey, 12, { errand: 'the-road' });
    expect(donkey.state).toBe('refusing');

    donkey.standsIn(TEMPLE); // a place that settles rather than frightens
    stand(donkey, 40, { errand: 'the-road' });
    expect(donkey.state).toBe('carrying');
  });
});

describe('the same room reaches a character built on nothing but booleans', () => {
  /** Seconds until he denies you, or -1 if he holds. */
  const timeToBreak = (place: typeof DREAD | typeof NOWHERE): number => {
    const peter = new Actor(PETER);
    peter.standsIn(place);
    for (let t = 0; t < 200; t++) {
      peter.update(1, quiet({ underThreat: true }));
      if (peter.state === 'denying') return t;
    }
    return -1;
  };

  it('makes Peter break sooner, which is what a room can do to a man', () => {
    /* Both are threatened and both eventually break: his own arc sees to that.
       What the room changes is the tempo, so that is what gets measured. A
       test on the end state would have passed for the wrong reason. */
    const calm = timeToBreak(NOWHERE);
    const frightening = timeToBreak(DREAD);

    expect(calm).toBeGreaterThan(0);
    expect(frightening).toBeGreaterThan(0);
    expect(frightening).toBeLessThan(calm);
  });
});

describe('atmospheres are well formed', () => {
  it('names a passage for every one of them', () => {
    for (const place of ATMOSPHERES) {
      expect(place.source, place.id).toMatch(/^[A-Z0-9]{3}\.\d+(\.\d+)?$/);
      expect(place.note.length, place.id).toBeGreaterThan(15);
    }
  });

  it('leaves a character untouched where the place has no weight', () => {
    const actor = new Actor(PETER);
    actor.standsIn(NOWHERE);
    const before = { ...actor.disposition };
    stand(actor, 30);
    expect(actor.disposition.fear).toBeCloseTo(before.fear, 5);
  });

  it('reports where a character is standing', () => {
    const actor = new Actor(PETER);
    expect(actor.standing).toBeNull();
    actor.standsIn(DREAD);
    expect(actor.standing?.id).toBe('dread');
  });
});
