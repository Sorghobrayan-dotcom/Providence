import { describe, expect, it } from 'vitest';
import { simulate, report } from '../providence/simulate';
import { DESERT, PALACE, HOUSEHOLD, NOWHERE, colour, press } from '../providence/atmosphere';
import { ELIJAH, MARTHA, MARY } from '../providence/drives';
import { ELIJAH_ARC, MARTHA_ARC, MARY_ARC } from '../providence/motivated';

/**
 * A thousand runs of the same cast in two rooms. If the place is decoration the
 * two reports come out the same, and this whole module is a waste. They do not.
 */

const CAST = [
  { arc: MARTHA_ARC, profile: MARTHA, name: 'marthe' },
  { arc: MARY_ARC, profile: MARY, name: 'marie' },
];

describe('a place presses on the people standing in it', () => {
  it('raises the floor of the room without lowering what is already there', () => {
    const quiet = { disorder: 0, unmetNeed: 0, falsehood: 0, worthHearing: 0, clamour: 0, strain: 0 };
    const inPalace = colour(PALACE, quiet);
    expect(inPalace.clamour).toBeGreaterThan(0.5); // a palace is never silent

    const alreadyLoud = { ...quiet, clamour: 0.9 };
    expect(colour(PALACE, alreadyLoud).clamour).toBe(0.9); // never pushed down
  });

  it('leans on wants: standing matters in a palace, rest matters in a desert', () => {
    expect(press(PALACE, MARTHA.drives).standing).toBeGreaterThan(MARTHA.drives.standing);
    expect(press(DESERT, ELIJAH.drives).rest).toBeGreaterThan(ELIJAH.drives.rest);
    expect(press(DESERT, MARTHA.drives).order).toBeLessThan(MARTHA.drives.order);
  });

  it('leaves everything alone where the place has no character', () => {
    expect(press(NOWHERE, MARY.drives)).toEqual(MARY.drives);
  });
});

describe('one thousand runs, two rooms', () => {
  const desert = simulate({ place: DESERT, cast: CAST, runs: 1000, seconds: 40, seed: 7 });
  const palace = simulate({ place: PALACE, cast: CAST, runs: 1000, seconds: 40, seed: 7 });

  it('runs a thousand of each without stalling', () => {
    expect(desert.runs).toBe(1000);
    expect(palace.runs).toBe(1000);
    expect(Object.keys(desert.transitions).length).toBeGreaterThan(0);
  });

  it('produces different outcomes in the two rooms from the same seed', () => {
    // identical cast, identical seed, identical scene generator: only the room differs
    expect(desert.endings['marthe']).not.toEqual(palace.endings['marthe']);
  });

  it('sends Martha tidying far more often in a palace than in a desert', () => {
    const tidyIn = (t: typeof desert) => (t.wants['marthe']?.['tidy'] ?? 0);
    expect(tidyIn(palace)).toBeGreaterThan(tidyIn(desert));
  });

  it('keeps Mary listening in both, because the room does not own her', () => {
    const listens = (t: typeof desert) => (t.wants['marie']?.['listen'] ?? 0);
    expect(listens(desert)).toBeGreaterThan(0);
    expect(listens(palace)).toBeGreaterThan(0);
  });

  it('answers roughly one desperate episode in five, wherever it happens', () => {
    for (const tally of [desert, palace]) {
      if (tally.graceEpisodes < 50) continue; // too few to judge
      const rate = tally.graceAnswered / tally.graceEpisodes;
      expect(rate).toBeGreaterThan(0.1);
      expect(rate).toBeLessThan(0.32);
    }
  });

  it('prints a report a human can read', () => {
    const text = report(desert);
    expect(text).toContain('Le Desert');
    expect(text).toContain('marthe');
    expect(text).toContain('grace');
    console.log('\n' + report(desert) + '\n\n' + report(palace) + '\n');
  });
});

describe('Elijah in the desert is not Elijah at court', () => {
  const cast = [{ arc: ELIJAH_ARC, profile: ELIJAH, name: 'elie' }];
  const desert = simulate({ place: DESERT, cast, runs: 600, seconds: 50, seed: 21 });
  const palace = simulate({ place: PALACE, cast, runs: 600, seconds: 50, seed: 21 });

  it('reaches the quiet ending in the desert, which the palace never offers', () => {
    const restoredInDesert = desert.endings['elie']?.['restored'] ?? 0;
    const restoredInPalace = palace.endings['elie']?.['restored'] ?? 0;
    expect(restoredInDesert).toBeGreaterThan(restoredInPalace);
    console.log(`\n  elie restored: desert ${restoredInDesert}/600, palace ${restoredInPalace}/600\n`);
  });
});

describe('the household is where Martha and Mary actually differ', () => {
  it('splits the two of them in the same room, from the same events', () => {
    const house = simulate({ place: HOUSEHOLD, cast: CAST, runs: 800, seconds: 30, seed: 3 });
    const marthaWants = Object.entries(house.wants['marthe'] ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    const maryWants = Object.entries(house.wants['marie'] ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    expect(marthaWants).not.toBe(maryWants);
    console.log(`\n  same house: marthe mostly wants to ${marthaWants}, marie to ${maryWants}\n`);
  });
});
