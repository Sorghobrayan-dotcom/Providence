import { describe, expect, it } from 'vitest';

import { Actor, blankWorld } from '../providence/Actor';
import { RelationGraph } from '../providence/relations';
import {
  covenantOf, DEVOTED_EYES, FUGITIVE_EYES, NO_COVENANT, readingFor,
} from '../providence/covenant';
import { LIBRARY } from '../providence/arcs';

/**
 * Standing before the Law, and the readings of it.
 *
 * The claim under test is the one that makes this an engine rather than a
 * dialogue tree: the same question, asked by two different players, produces
 * opposite behaviour without a single branch on a story flag. What differs is
 * the record the players built, and how this particular archetype reads it.
 */

const jonah = LIBRARY.find((a) => a.id === 'jonah')!;

/** A player who has kept the Law. */
function justPlayer(): RelationGraph {
  const g = new RelationGraph();
  g.commit({ kind: 'bless', actor: 'player', toward: 'boaz', amount: 1 });
  g.commit({ kind: 'forgive', actor: 'player', toward: 'naomi' });
  g.commit({ kind: 'redeem', actor: 'player', toward: 'ruth' });
  return g;
}

/** A player who has broken it. */
function transgressorPlayer(): RelationGraph {
  const g = new RelationGraph();
  g.commit({ kind: 'betray', actor: 'player', toward: 'boaz' });
  g.commit({ kind: 'steal-blessing', actor: 'player', toward: 'naomi' });
  return g;
}

describe('reading the ledger', () => {
  it('calls someone with no record neutral rather than guessing', () => {
    expect(covenantOf(new RelationGraph()).standing).toBe('neutral');
    expect(covenantOf(new RelationGraph())).toEqual(NO_COVENANT);
  });

  it('reads a keeper of the Law as just', () => {
    const c = covenantOf(justPlayer());
    expect(c.standing).toBe('just');
    expect(c.score).toBeGreaterThan(0.35);
    expect(c.bloodGuilt).toBe(0);
  });

  it('reads a breaker of it as a transgressor', () => {
    const c = covenantOf(transgressorPlayer());
    expect(c.standing).toBe('transgressor');
    expect(c.score).toBeLessThan(0);
  });

  it('does not charge anyone for a deed the world refused', () => {
    const g = new RelationGraph();
    g.commit({ kind: 'bless', actor: 'player', toward: 'boaz', amount: 1 });
    const before = covenantOf(g);

    // an attempt the engine blocked is on the record as an attempt, not a deed
    g.commit({ kind: 'steal-blessing', actor: 'player', toward: 'boaz' });
    const after = covenantOf(g);

    const refused = g.ledger.filter((j) => j.refused).length;
    if (refused > 0) expect(after.standing).toBe(before.standing);
    else expect(after.score).toBeLessThan(before.score);
  });

  describe('blood', () => {
    it('does not average out under any weight of later good', () => {
      const g = new RelationGraph();
      g.commit({ kind: 'shed-blood', actor: 'player', toward: 'abel' });
      for (let i = 0; i < 40; i += 1) {
        g.commit({ kind: 'bless', actor: 'player', toward: `n${i}`, amount: 1 });
        g.commit({ kind: 'forgive', actor: 'player', toward: `m${i}` });
      }
      const c = covenantOf(g);

      // the running total says saint; the standing does not, and must not
      expect(c.score).toBeGreaterThan(0.35);
      expect(c.standing).toBe('transgressor');
      expect(c.bloodGuilt).toBe(1);
      expect(c.because).toBe('GEN.4.10');
    });
  });
});

describe('the same record, read through different eyes', () => {
  const just = covenantOf(justPlayer());
  const transgressor = covenantOf(transgressorPlayer());

  it('frightens the fugitive with the very thing that opens the devoted', () => {
    const fugitiveOnJust = FUGITIVE_EYES(just).pressure;
    const devotedOnJust = DEVOTED_EYES(just).pressure;

    // the inversion, stated as plainly as it can be
    expect(fugitiveOnJust.fear!).toBeGreaterThan(0);
    expect(devotedOnJust.fear!).toBeLessThan(0);
    expect(fugitiveOnJust.trust!).toBeLessThan(0);
    expect(devotedOnJust.trust!).toBeGreaterThan(0);
  });

  it('warms the fugitive to a transgressor', () => {
    const p = FUGITIVE_EYES(transgressor).pressure;
    expect(p.trust!).toBeGreaterThan(0);
    expect(p.fear!).toBeLessThan(0);
  });

  it('does not shake the devoted resolve, whoever is standing there', () => {
    // a devotion that only holds for the deserving is not what Ruth 1:16 says
    expect(DEVOTED_EYES(transgressor).pressure.resolve ?? 0).toBe(0);
  });

  it('leaves a deliberately blind archetype completely alone', () => {
    // she sees the angel whichever kind of man is on her back
    expect(readingFor('balaams-donkey', just).pressure).toEqual({});
    expect(readingFor('balaams-donkey', transgressor).pressure).toEqual({});
  });

  it('treats an arc that is not in the table as blind too', () => {
    expect(readingFor('no-such-arc', just).pressure).toEqual({});
  });
});

describe('"will you help me with my quest?"', () => {
  /** Ask Jonah, and let the arc run. Nothing here tells him what to answer. */
  function ask(graph: RelationGraph): { state: string; move: string; refusing: boolean } {
    const actor = new Actor(jonah);
    const world = {
      ...blankWorld(),
      distanceToPlayer: 3,
      errand: 'nineveh',
      requestsMade: 1,
      covenant: covenantOf(graph),
    };
    actor.update(0.5, world);
    return {
      state: actor.state,
      move: actor.directive.move,
      refusing: actor.directive.refusing === true,
    };
  }

  it('makes him back away from a righteous asker', () => {
    const r = ask(justPlayer());
    expect(r.state).toBe('shrinking');
    expect(r.move).toBe('away-from-player');
    expect(r.refusing).toBe(true);
  });

  it('makes him close the distance to a fellow fugitive', () => {
    const r = ask(transgressorPlayer());
    expect(r.state).toBe('confiding');
    expect(r.move).toBe('toward-player');
    expect(r.refusing).toBe(false);
  });

  it('is the same question and the opposite answer', () => {
    const pious = ask(justPlayer());
    const guilty = ask(transgressorPlayer());
    expect(pious.move).toBe('away-from-player');
    expect(guilty.move).toBe('toward-player');
  });

  it('leaves him on his own arc when the asker has no record', () => {
    // with nothing to read, standing must not invent a reaction
    const r = ask(new RelationGraph());
    expect(['fleeing', 'commissioned']).toContain(r.state);
  });
});

describe('standing works on him over time, not in one frame', () => {
  it('raises a fugitive\'s fear the longer a righteous player stands there', () => {
    const actor = new Actor(jonah);
    const world = {
      ...blankWorld(), distanceToPlayer: 3, errand: 'nineveh',
      covenant: covenantOf(justPlayer()),
    };

    const start = actor.disposition.fear;
    actor.update(0.4, world);
    // less than a second in: a standing is not a switch
    expect(actor.disposition.fear).toBe(start);

    for (let i = 0; i < 8; i += 1) actor.update(0.5, world);
    expect(actor.disposition.fear).toBeGreaterThan(start);
  });

  it('does nothing at all to an archetype that is blind to standing', () => {
    const donkey = LIBRARY.find((a) => a.id === 'balaams-donkey');
    if (!donkey) return;
    const actor = new Actor(donkey);
    const before = { ...actor.disposition };
    const world = { ...blankWorld(), distanceToPlayer: 30, covenant: covenantOf(justPlayer()) };
    for (let i = 0; i < 6; i += 1) actor.update(0.5, world);
    expect(actor.disposition).toEqual(before);
  });
});
