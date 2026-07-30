import { describe, expect, it } from 'vitest';

import {
  CLEAR, SIGNS, gather, nearness, signFor, testimonyOf, urgencyOf,
} from '../providence/testimony';
import { UNDEFILED, defile, shedBlood } from '../providence/standing';
import { Actor, blankWorld } from '../providence/Actor';
import { LIBRARY } from '../providence/arcs';
import type { Disposition } from '../providence/types';

/**
 * The world answering a man.
 *
 * The claim worth defending is the split: an archetype fixes the KIND of
 * testimony and never the amount, and the amount comes off his condition and
 * never off the table. Break either half and this becomes a weather script with
 * extra steps.
 */

const calm: Disposition = { trust: 0.5, fear: 0.1, resolve: 0.9 };
/** The single most common starting fear in the library. Everything is measured here. */
const written: Disposition = { trust: 0.5, fear: 0.2, resolve: 0.5 };
const terrified: Disposition = { trust: 0.2, fear: 0.9, resolve: 0.2 };

const near = 0;

describe('the default is that nothing happens', () => {
  it('leaves the world alone for a character with no sign', () => {
    expect(testimonyOf('ruth', terrified, UNDEFILED, near)).toEqual(CLEAR);
    expect(signFor('ruth').moves).toEqual({});
  });

  it('leaves it alone for an arc nobody has considered', () => {
    expect(testimonyOf('no-such-arc', terrified, UNDEFILED, near)).toEqual(CLEAR);
  });

  it('keeps the table sparse on purpose', () => {
    // the effect only reads because most people walk through and nothing moves
    expect(Object.keys(SIGNS).length).toBeLessThan(12);
  });
});

describe('calibration, against the range the simulation actually travels', () => {
  /*
   * Two mistakes are pinned here, both made and both measured.
   *
   * Bearing was tuned against fear 0.95, which no arc ever reaches, and the
   * effect was invisible on screen while passing its unit tests. So the first
   * cut of this used Bearing's power curve — and hit the opposite failure. A
   * power curve lifts the bottom of the range: a merely reluctant Jonah already
   * dimmed the sky a tenth, terror added almost nothing on top, and no state
   * change read. Everyone was permanently half-stormy.
   *
   * The numbers below are what the renderer was measured doing, not what the
   * formula was hoped to do.
   */
  it('stays out of the way while he is only reluctant', () => {
    const t = testimonyOf('jonah', written, UNDEFILED, near);
    // the sea got up when he ran, not while he stood there not wanting to go
    expect(CLEAR.light - t.light).toBeLessThan(0.05);
    expect(t.wind).toBeLessThan(CLEAR.wind * 2);
  });

  it('brings it down once he is actually running', () => {
    const running = testimonyOf('jonah', { trust: 0.3, fear: 0.7, resolve: 0.3 }, UNDEFILED, near);
    expect(CLEAR.light - running.light).toBeGreaterThan(0.25);
    expect(running.wind).toBeGreaterThan(CLEAR.wind * 6);
  });

  it('keeps a usable spread between reluctant and fleeing', () => {
    // the failure being guarded is not weak effect, it is squashed difference
    const rest = testimonyOf('jonah', written, UNDEFILED, near);
    const flight = testimonyOf('jonah', terrified, UNDEFILED, near);
    expect(rest.light - flight.light).toBeGreaterThan(0.4);
  });
});

describe('driven by the arc rather than by a number I chose', () => {
  it('raises the storm as Jonah flees and lets it off when he yields', () => {
    const jonah = LIBRARY.find((a) => a.id === 'jonah')!;
    const actor = new Actor(jonah);
    const scene = { ...blankWorld(), distanceToPlayer: 2, errand: 'nineveh' };

    const at: Record<string, number> = {};
    let darkest = CLEAR.light;
    for (let step = 0; step < 60; step += 1) {
      actor.update(0.5, scene);
      const t = testimonyOf('jonah', actor.disposition, actor.bears, 2);
      at[actor.state] = t.light;
      darkest = Math.min(darkest, t.light);
    }

    // he does flee, and the sky answers it rather than staying level
    expect(at['fleeing']).toBeDefined();
    expect(darkest).toBeLessThan(0.6);

    // and once he is caught and obeying, it starts to clear
    const yielded = at['obeying'] ?? at['caught'];
    expect(yielded).toBeDefined();
    expect(yielded!).toBeGreaterThan(darkest);
  });
});

describe('the kind is the archetype, the amount is the state', () => {
  it('never turns one kind of testimony into another', () => {
    const scared = testimonyOf('goliath', terrified, UNDEFILED, near);
    const settled = testimonyOf('goliath', calm, UNDEFILED, near);

    // more of the same thing, and never a channel the sign does not name
    expect(scared.tremor).toBeGreaterThan(settled.tremor);
    expect(scared.wind).toBe(CLEAR.wind);
    expect(settled.wind).toBe(CLEAR.wind);
  });

  it('gives two archetypes in the same state completely different worlds', () => {
    // measured where both are active: at rest neither of them does anything,
    // which is the point of the calibration above rather than a counterexample
    const storm = testimonyOf('jonah', terrified, UNDEFILED, near);
    const hush = testimonyOf('serpent', terrified, UNDEFILED, near);

    expect(storm.wind).toBeGreaterThan(CLEAR.wind);
    expect(hush.wind).toBeLessThan(CLEAR.wind);
    expect(hush.sound).toBeLessThan(0.7);
    expect(storm.sound).toBeGreaterThan(hush.sound);
  });
});

describe('what a man carries, the world answers', () => {
  it('answers blood on a man who is perfectly calm', () => {
    const guilty = shedBlood(UNDEFILED, false);
    expect(urgencyOf(calm, guilty)).toBeGreaterThan(urgencyOf(calm, UNDEFILED));
  });

  it('does not let a frightened innocent out-testify a settled killer', () => {
    // taking the strongest condition rather than the sum is what buys this
    const killer = urgencyOf(calm, shedBlood(UNDEFILED, false));
    const innocent = urgencyOf(written, UNDEFILED);
    expect(killer).toBeGreaterThan(innocent);
  });

  it('leans harder on a thing that is hidden than on the same thing owned', () => {
    const open = urgencyOf(calm, shedBlood(UNDEFILED, false));
    const kept = urgencyOf(calm, shedBlood(UNDEFILED, true));
    expect(kept).toBeGreaterThan(open);
  });

  it('reads defilement as lighter than blood, because one of them washes', () => {
    expect(urgencyOf(calm, defile(UNDEFILED, 1))).toBeLessThan(
      urgencyOf(calm, shedBlood(UNDEFILED, false)),
    );
  });
});

describe('how far it reaches', () => {
  it('is full at arm\'s length and gone across a field', () => {
    expect(nearness(0)).toBe(1);
    expect(nearness(30)).toBe(0);
    expect(nearness(7.5)).toBeCloseTo(0.5, 5);
  });

  it('does not black out the sky for someone brooding across the map', () => {
    const here = testimonyOf('pharaoh', terrified, UNDEFILED, 0);
    const yonder = testimonyOf('pharaoh', terrified, UNDEFILED, 40);

    expect(here.light).toBeLessThan(0.5);
    expect(yonder).toEqual(CLEAR);
  });

  it('survives a distance that is not a number', () => {
    expect(testimonyOf('jonah', terrified, UNDEFILED, Number.NaN)).toEqual(CLEAR);
  });
});

describe('several people, one sky', () => {
  it('is CLEAR when the scene is empty', () => {
    expect(gather([])).toEqual(CLEAR);
  });

  it('takes the loudest testimony rather than adding them up', () => {
    const one = testimonyOf('jonah', written, UNDEFILED, near);
    const crowd = gather([one, one, one, one, one]);
    // five frightened Jonahs are not five storms
    expect(crowd).toEqual(one);
  });

  it('lets each channel come from whoever is furthest out on it', () => {
    const storm = testimonyOf('jonah', terrified, UNDEFILED, near);
    const weight = testimonyOf('goliath', terrified, UNDEFILED, near);
    const both = gather([storm, weight]);

    expect(both.wind).toBe(storm.wind);      // only Jonah moves air
    expect(both.tremor).toBe(weight.tremor); // only Goliath moves ground
  });

  it('does not let a calm bystander wash the storm out', () => {
    const storm = testimonyOf('jonah', terrified, UNDEFILED, near);
    const bystander = testimonyOf('ruth', calm, UNDEFILED, near);
    expect(gather([storm, bystander])).toEqual(storm);
    expect(gather([bystander, storm])).toEqual(storm);
  });
});

describe('the channels stay inside their own range', () => {
  it('never drives a magnitude below zero or above one', () => {
    for (const id of Object.keys(SIGNS)) {
      const t = testimonyOf(id, terrified, shedBlood(shedBlood(UNDEFILED, true), true), near);
      for (const key of ['light', 'wind', 'haze', 'tremor', 'sound'] as const) {
        expect(t[key]).toBeGreaterThanOrEqual(0);
        expect(t[key]).toBeLessThanOrEqual(1);
      }
      expect(t.cast).toBeGreaterThanOrEqual(-1);
      expect(t.cast).toBeLessThanOrEqual(1);
    }
  });

  it('names a passage for every sign, so none of it is set dressing', () => {
    for (const [id, sign] of Object.entries(SIGNS)) {
      expect(sign.source, id).toMatch(/^[A-Z0-9]{3}\.\d+\.\d+$/);
      expect(sign.note.length, id).toBeGreaterThan(20);
      expect(Object.keys(sign.moves).length, id).toBeGreaterThan(0);
    }
  });
});
