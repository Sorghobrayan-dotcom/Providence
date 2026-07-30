import type { Disposition } from './types';
import { strainOf, type Standing } from './standing';

/**
 * What the world does around a man because of what he is.
 *
 * atmosphere.ts runs the other way: a room presses on the people standing in
 * it. This is the outward half. The ground cried out over one man's blood
 * before anyone had said a word about it (GEN.4.10), and the sea got up over
 * another man's flight while he slept through it. A world that stays level
 * whoever walks into it is a world that does not know anything.
 *
 * Two things compose, and keeping them apart is the whole design:
 *
 *   the SIGN says what KIND of testimony this presence is. It is per archetype,
 *   because a storm is not a tremor is not a hush, and no amount of state will
 *   turn one into another.
 *
 *   the URGENCY says HOW MUCH, and that is read entirely off his condition. The
 *   same Jonah barely clouds the sky when he is calm and brings the squall down
 *   when he is running.
 *
 * So nothing here is a weather script. Naming an archetype gets you a kind; the
 * simulation decides the amount, frame by frame.
 *
 * The table is deliberately sparse. Most people do not change the weather, and
 * a version where all twenty four did would say nothing at all — the effect
 * only means something because Ruth walks in and the sky stays where it was.
 */

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * Where the effect lives, measured rather than guessed.
 *
 * Bearing uses a power curve because its failure was absolute invisibility. The
 * failure here is the opposite one, and the first cut walked straight into it:
 * a power curve lifts the bottom of the range, so a merely uneasy Jonah already
 * dimmed the sky by a tenth and being terrified barely added to it. Everyone
 * was permanently half-stormy and no state change read on screen.
 *
 * A rising S instead. Nothing at all below a floor, the whole climb across the
 * band a fleeing man actually travels, saturating before the ceiling. Starting
 * fear across the library is 0.1 to 0.3, but the fleeing node drifts it +0.05
 * per second, so play spends its time between roughly 0.2 and 0.9 — which is
 * where this puts the movement.
 *
 * The floor matters as much as the slope. The sea got up when Jonah ran, not
 * while he stood there being reluctant, and a sky that is already dark before
 * he does anything has nothing left to say when he does.
 */
const FLOOR = 0.12;
const CEILING = 0.75;
const felt = (n: number): number => {
  const t = clamp01((clamp01(n) - FLOOR) / (CEILING - FLOOR));
  return t * t * (3 - 2 * t);
};

/**
 * What the world is doing. Every channel is normalised so a renderer can map it
 * however it likes without knowing anything about Scripture.
 */
export interface Testimony {
  /** Light the sky keeps. 1 is full day, 0 is blackness. */
  readonly light: number;
  /** Air movement. 0 is dead still, 1 is a storm. */
  readonly wind: number;
  /** How closed in the distance is. 0 is clear, 1 is nothing beyond arm's reach. */
  readonly haze: number;
  /** Movement in the ground underfoot. 0 is solid. */
  readonly tremor: number;
  /** How much ambient sound survives. 1 is full, 0 is a held breath. */
  readonly sound: number;
  /** Colour drift. −1 is cold, 0 is neutral, +1 is warm. */
  readonly cast: number;
}

/** A world with nobody in it worth remarking on. */
export const CLEAR: Testimony = {
  light: 1, wind: 0.08, haze: 0.05, tremor: 0, sound: 1, cast: 0,
};

export interface Sign {
  /** Departure from CLEAR at full urgency. Absent channels are left alone. */
  readonly moves: Partial<Testimony>;
  readonly source: string;
  readonly note: string;
}

/** Nothing. Most characters, and the honest default for one we have not considered. */
export const UNREMARKABLE: Sign = {
  moves: {},
  source: 'GEN.1.31',
  note: 'a man walks through a day and the day is unchanged',
};

/**
 * Who the world answers, and how.
 *
 * Every entry has to be defensible from the text, not from what would look good
 * on screen. Where the passage does not put the world in motion, the arc stays
 * out of this table.
 */
export const SIGNS: Readonly<Record<string, Sign>> = {
  /* The sea got up while he was asleep below deck, which is the point: the
     testimony is not his performance, it happens whether he acknowledges it. */
  jonah: {
    moves: { light: -0.5, wind: 0.75, haze: 0.3, cast: -0.45, sound: -0.1 },
    source: 'JON.1.4',
    note: 'a great wind on the sea, and he is the reason, and he is asleep',
  },

  /* Forty days of him coming out and standing there. The weight is the man. */
  goliath: {
    moves: { tremor: 0.7, haze: 0.35, sound: -0.15, cast: -0.15 },
    source: '1SA.17.16',
    note: 'he presented himself morning and evening, and the ground knew it',
  },

  /* Subtler than any beast of the field. The hush is the tell: everything that
     was making noise stops, and the quiet is what should frighten you. */
  serpent: {
    moves: { sound: -0.7, light: -0.12, haze: 0.25, wind: -0.06 },
    source: 'GEN.3.1',
    note: 'the world goes quiet so that one voice can be heard clearly',
  },

  /* The same hush, in a place already empty. Nothing left to drown him out. */
  tempter: {
    moves: { sound: -0.55, haze: 0.2, cast: 0.15 },
    source: 'MAT.4.1',
    note: 'led up into the wilderness, where there is nothing else to listen to',
  },

  /* Darkness that could be felt, three days, over one man's refusal. */
  pharaoh: {
    moves: { light: -0.7, haze: 0.45, cast: -0.3, sound: -0.2 },
    source: 'EXO.10.22',
    note: 'a darkness over the land that a hand could be laid on',
  },

  /* Nothing in the sky. The camp simply cannot stand, and no one knows why
     until the hidden thing is found — which is why concealment drives it. */
  achan: {
    moves: { light: -0.3, haze: 0.4, sound: -0.25, cast: -0.2 },
    source: 'JOS.7.12',
    note: 'they cannot stand before their enemies, and the cause is under a tent',
  },

  /* The spirit troubles him and the room goes with him. */
  saul: {
    moves: { light: -0.35, cast: -0.4, sound: -0.2, tremor: 0.1 },
    source: '1SA.16.14',
    note: 'the trouble is in him, and everyone in the hall can feel where it is',
  },
};

export function signFor(arcId: string): Sign {
  return SIGNS[arcId] ?? UNREMARKABLE;
}

/**
 * How much of himself a man is carrying at this moment.
 *
 * The strongest of his conditions drives it rather than the sum: a man can be
 * perfectly calm and blood-guilty, and the world still answers the blood. Adding
 * them would let a frightened innocent out-testify a settled murderer.
 */
export function urgencyOf(disposition: Disposition, standing: Standing): number {
  const afraid = felt(disposition.fear);

  /* Blood outweighs defilement because one washes and the other does not, and
     concealment adds on top: the hidden thing is exactly what Achan's camp
     could not stand under. */
  const blood = clamp01(standing.bloodGuilt * 0.5);
  const borne = felt(clamp01(Math.max(blood, standing.defilement * 0.35) + strainOf(standing) * 0.25));

  return clamp01(Math.max(afraid, borne));
}

/**
 * How far his presence reaches.
 *
 * Full at arm's length, gone by about fifteen metres. Without this the sky would
 * be black because someone is brooding on the far side of the map, and the
 * player would have no way to learn that the weather is about a person.
 */
export function nearness(metres: number): number {
  if (!Number.isFinite(metres)) return 0;
  const REACH = 15;
  return clamp01(1 - Math.max(0, metres) / REACH);
}

/** What the world does around this character, right now. */
export function testimonyOf(
  arcId: string,
  disposition: Disposition,
  standing: Standing,
  metres: number,
): Testimony {
  const sign = signFor(arcId);
  const amount = urgencyOf(disposition, standing) * nearness(metres);

  const out = { ...CLEAR };
  for (const key of Object.keys(sign.moves) as (keyof Testimony)[]) {
    const delta = (sign.moves[key] ?? 0) * amount;
    // cast is the only signed channel; the rest are magnitudes
    const low = key === 'cast' ? -1 : 0;
    out[key] = Math.max(low, Math.min(1, CLEAR[key] + delta));
  }
  return out;
}

/**
 * One world, several people in it.
 *
 * Per channel this takes the furthest departure from CLEAR rather than the sum,
 * because two frightened men do not make twice the storm — the loudest
 * testimony is the one you notice, and adding them would black the sky out the
 * moment a crowd turned up.
 */
export function gather(testimonies: readonly Testimony[]): Testimony {
  if (testimonies.length === 0) return CLEAR;

  const out = { ...CLEAR };
  for (const key of Object.keys(CLEAR) as (keyof Testimony)[]) {
    let furthest = CLEAR[key];
    for (const t of testimonies) {
      if (Math.abs(t[key] - CLEAR[key]) > Math.abs(furthest - CLEAR[key])) furthest = t[key];
    }
    out[key] = furthest;
  }
  return out;
}
