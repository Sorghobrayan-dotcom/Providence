import { describe, expect, it } from 'vitest';

import { Actor, blankWorld } from '../providence/Actor';
import {
  aspectOf, atone, conditionOf, defile, elapse, keepLaw,
  pressureOf, shedBlood, strainOf, UNDEFILED,
} from '../providence/standing';
import { LIBRARY } from '../providence/arcs';

/**
 * A character's own standing.
 *
 * Two claims are load-bearing here. The first is that ritual defilement and
 * blood guilt are different kinds of thing and no rite conflates them. The
 * second is the one the brief turns on: a secret is not a smaller version of a
 * known thing. The same defilement, concealed or carried openly, has to produce
 * opposite behaviour, or "un crime de sang secret" is just a boolean.
 */

const patriarch = LIBRARY[0]!;

describe('the two kinds of broken', () => {
  it('clears defilement by rite, because the text says it clears', () => {
    const touched = defile(UNDEFILED, 0.8);
    expect(conditionOf(touched)).toBe('defiled');

    const washed = atone(touched, 'sacrifice');
    expect(washed.defilement).toBe(0);
    expect(conditionOf(washed)).toBe('kept');
  });

  it('washes less thoroughly than it sacrifices', () => {
    const touched = defile(UNDEFILED, 1);
    expect(atone(touched, 'washing').defilement).toBeGreaterThan(
      atone(touched, 'sacrifice').defilement,
    );
  });

  it('never lets any rite touch blood', () => {
    let s = shedBlood(UNDEFILED);
    for (const rite of ['sacrifice', 'washing', 'restitution'] as const) {
      for (let i = 0; i < 20; i += 1) s = atone(s, rite);
    }
    expect(s.bloodGuilt).toBe(1);
    expect(conditionOf(s)).toBe('cursed');
  });

  it('outranks every other condition with blood', () => {
    const favoured = keepLaw(keepLaw(keepLaw(UNDEFILED)));
    expect(conditionOf(favoured)).toBe('blessed');
    expect(conditionOf(shedBlood(favoured))).toBe('cursed');
  });

  it('counts time since the rite, so nothing is clean the same instant', () => {
    const washed = atone(defile(UNDEFILED, 0.5), 'washing');
    expect(washed.sinceRite).toBe(0);
    expect(elapse(washed, 12).sinceRite).toBe(12);
  });
});

describe('the secret', () => {
  const openly = defile(UNDEFILED, 0.6);
  const hidden = defile(UNDEFILED, 0.6, true);

  it('costs nothing to carry in the open and something to carry hidden', () => {
    expect(strainOf(openly)).toBe(0);
    expect(strainOf(hidden)).toBeGreaterThan(0);
  });

  it('inverts the pressure: grief in the open, vigilance in secret', () => {
    const grief = pressureOf(openly);
    const vigilance = pressureOf(hidden);

    // carried openly it drains him and gives him no reason to distrust anyone
    expect(grief.resolve!).toBeLessThan(0);
    expect(grief.trust ?? 0).toBe(0);

    // carried hidden, everyone in the room is someone who might find out
    expect(vigilance.fear!).toBeGreaterThan(0);
    expect(vigilance.trust!).toBeLessThan(0);
  });

  it('weighs blood heavier than defilement in what it costs to hide', () => {
    expect(strainOf(shedBlood(UNDEFILED, true))).toBeGreaterThan(strainOf(hidden));
  });

  it('stops costing anything once a rite brings it into the open', () => {
    expect(strainOf(atone(hidden, 'washing'))).toBe(0);
  });

  it('does not let a rite quietly un-hide blood', () => {
    // washing is public, but it does not confess a killing
    const secretBlood = shedBlood(UNDEFILED, true);
    expect(atone(secretBlood, 'sacrifice').concealed).toBe(true);
  });
});

describe('what it looks like', () => {
  it('drains a defiled body and lights one in favour', () => {
    expect(aspectOf(defile(UNDEFILED, 0.9)).wither).toBeGreaterThan(0.5);
    expect(aspectOf(keepLaw(UNDEFILED, 1)).glow).toBeGreaterThan(0.5);
    expect(aspectOf(UNDEFILED).wither).toBe(0);
  });

  it('keeps a concealed man looking clean, and makes the look unsteady', () => {
    const secret = keepLaw(shedBlood(UNDEFILED, true), 1);
    const exposed = keepLaw(shedBlood(UNDEFILED, false), 1);

    // he still performs being blessed; what gives him away is the flicker
    expect(aspectOf(secret).glow).toBeGreaterThan(aspectOf(exposed).glow);
    expect(aspectOf(secret).flicker).toBeGreaterThan(0.5);
    expect(aspectOf(exposed).flicker).toBe(0);
  });

  it('never asks the materials for more than they can spend', () => {
    let s = shedBlood(shedBlood(defile(UNDEFILED, 1), true), true);
    s = keepLaw(s, 1);
    const a = aspectOf(s);
    for (const v of [a.wither, a.glow, a.flicker]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('a standing rides on the character', () => {
  const world = () => ({ ...blankWorld(), distanceToPlayer: 6 });

  it('presses over seconds rather than snapping the mood', () => {
    const actor = new Actor(patriarch);
    actor.stands(shedBlood(UNDEFILED, true));

    const start = actor.disposition.trust;
    actor.update(0.4, world());
    expect(actor.disposition.trust).toBe(start);

    for (let i = 0; i < 8; i += 1) actor.update(0.5, world());
    expect(actor.disposition.trust).toBeLessThan(start);
  });

  it('leaves an undefiled character entirely alone', () => {
    const actor = new Actor(patriarch);
    const before = { ...actor.disposition };
    for (let i = 0; i < 10; i += 1) actor.update(0.5, world());
    expect(actor.disposition.trust).toBe(before.trust);
    expect(actor.bears).toBe(UNDEFILED);
  });

  it('makes the secret and the confession diverge from the same crime', () => {
    const secret = new Actor(patriarch);
    secret.stands(shedBlood(UNDEFILED, true));
    const owned = new Actor(patriarch);
    owned.stands(shedBlood(UNDEFILED, false));

    for (let i = 0; i < 10; i += 1) {
      secret.update(0.5, world());
      owned.update(0.5, world());
    }

    // the same deed: one becomes watchful, the other only tired
    expect(secret.disposition.trust).toBeLessThan(owned.disposition.trust);
    expect(secret.disposition.fear).toBeGreaterThan(owned.disposition.fear);
  });
});
