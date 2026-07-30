import { describe, expect, it } from 'vitest';

import { RelationGraph } from '../providence/relations';
import { covenantOf, EYES, readingFor } from '../providence/covenant';
import { LIBRARY } from '../providence/arcs';
import { ADVERSARY_ARCS } from '../providence/adversaries';

/**
 * Every archetype's reading of the player's standing.
 *
 * The failure this file exists to catch is silent: a mistyped arc id in the
 * EYES table compiles, passes every other test, and simply never fires. The
 * character stays indifferent forever and nothing anywhere says so.
 */

/* LIBRARY already contains the adversaries, so this de-duplicates rather than
   concatenating: the shelf is 24 arcs, not 32. */
const ids = new Set([...LIBRARY, ...ADVERSARY_ARCS].map((a) => a.id));
const ALL = [...ids];

const standings = (() => {
  const just = new RelationGraph();
  just.commit({ kind: 'bless', actor: 'player', toward: 'a', amount: 1 });
  just.commit({ kind: 'forgive', actor: 'player', toward: 'b' });
  just.commit({ kind: 'redeem', actor: 'player', toward: 'c' });

  const bad = new RelationGraph();
  bad.commit({ kind: 'betray', actor: 'player', toward: 'a' });
  bad.commit({ kind: 'steal-blessing', actor: 'player', toward: 'b' });

  return { just: covenantOf(just), transgressor: covenantOf(bad), neutral: covenantOf(new RelationGraph()) };
})();

describe('coverage', () => {
  it('names only arcs that actually exist', () => {
    const unknown = Object.keys(EYES).filter((id) => !ids.has(id));
    expect(unknown).toEqual([]);
  });

  it('has considered every arc in the library', () => {
    const missing = ALL.filter((id) => !(id in EYES));
    expect(ALL).toHaveLength(24);
    expect(missing).toEqual([]);
  });
});

describe('every reading is well formed', () => {
  for (const id of Object.keys(EYES)) {
    it(`${id} stays inside what a disposition can absorb`, () => {
      for (const c of Object.values(standings)) {
        const { pressure, because } = readingFor(id, c);
        for (const [key, value] of Object.entries(pressure)) {
          expect(['trust', 'fear', 'resolve']).toContain(key);
          // a reading is a pressure per second, not a jump
          expect(Math.abs(value as number)).toBeLessThanOrEqual(0.1);
          expect(value).not.toBe(0);
        }
        expect(because).toMatch(/^[0-9A-Z]{3}\.\d+\.\d+$/);
      }
    });
  }

  it('says nothing at all to a player with no record', () => {
    for (const id of Object.keys(EYES)) {
      expect(readingFor(id, standings.neutral).pressure).toEqual({});
    }
  });
});

describe('the readings that carry a claim', () => {
  const on = (id: string, which: 'just' | 'transgressor') =>
    readingFor(id, standings[which]).pressure;

  it('makes merit itself the thing Saul is afraid of', () => {
    // 'Saul was afraid of David, because the LORD was with him'
    expect(on('saul', 'just').fear!).toBeGreaterThan(0);
    expect(on('saul', 'just').trust!).toBeLessThan(0);
    expect(on('saul', 'transgressor').fear!).toBeLessThan(0);
  });

  it('leaves the tempter nothing to work with on a transgressor', () => {
    // the weapon is accurate quotation; it needs someone who holds the text
    expect(on('tempter', 'just').resolve!).toBeGreaterThan(0);
    expect(on('tempter', 'transgressor').resolve!).toBeLessThan(0);
  });

  it('sends the watching father out to the one who went wrong', () => {
    const home = on('watching-father', 'just');
    const away = on('watching-father', 'transgressor');
    expect(away.trust!).toBeGreaterThan(home.trust!);
  });

  it('raises Abigail\'s resolve for the one in the wrong, not the one in the right', () => {
    // 'upon me let this iniquity be' — she interposes for the guilty party
    expect(on('abigail', 'transgressor').resolve!).toBeGreaterThan(0);
    expect(on('abigail', 'just').resolve ?? 0).toBe(0);
  });

  it('keeps Job\'s friends talking hardest at a righteous sufferer', () => {
    expect(on('jobs-friends', 'just').resolve!).toBeGreaterThan(0);
    expect(on('jobs-friends', 'transgressor').resolve!).toBeLessThan(0);
  });

  it('draws Zacchaeus and shames him at the same time', () => {
    const just = on('zacchaeus', 'just');
    expect(just.trust!).toBeGreaterThan(0);
    expect(just.fear!).toBeGreaterThan(0);
  });

  it('moves neither the donkey nor the judge, whoever is asking', () => {
    for (const id of ['balaams-donkey', 'unjust-judge']) {
      expect(readingFor(id, standings.just).pressure).toEqual({});
      expect(readingFor(id, standings.transgressor).pressure).toEqual({});
    }
  });
});

describe('the shape of the whole table', () => {
  it('sharpens more adversaries on a righteous player than it calms', () => {
    /* The claim the table is making: righteousness is not a universal calming
       influence, it is a provocation to whatever lives off it. */
    const adversaries = ADVERSARY_ARCS.map((a) => a.id).filter((id) => id in EYES);
    const sharpened = adversaries.filter(
      (id) => (readingFor(id, standings.just).pressure.resolve ?? 0) > 0,
    );
    expect(sharpened.length).toBeGreaterThan(adversaries.length / 3);
  });

  it('does not make every character react the same way', () => {
    const signatures = new Set(
      Object.keys(EYES).map((id) => JSON.stringify(readingFor(id, standings.just).pressure)),
    );
    // 24 archetypes that all read righteousness identically would not be archetypes
    expect(signatures.size).toBeGreaterThan(12);
  });
});
