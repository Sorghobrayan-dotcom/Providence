import type { Context } from './types';

/**
 * What a character wants, as opposed to what it does.
 *
 * Arcs describe how someone moves through a change. They cannot say why two
 * people in the same room, watching the same thing happen, do opposite things.
 * That needs drives: standing needs, weighted differently per character, which
 * score the options available and let the strongest pull win.
 *
 * Martha and Mary are the clearest case in the text. Same house, same guest,
 * same interruption. One cannot stop working and the other cannot be moved from
 * where she is sitting, and neither is malfunctioning. Luke 10:38-42.
 */

export interface Drives {
  /** Things in their place. Disorder is felt as pressure. */
  order: number;
  /** Being useful to someone. Idleness reads as failure. */
  service: number;
  /** Being present to what is happening rather than to what needs doing. */
  attention: number;
  /** Wrongness must be named out loud. */
  justice: number;
  /** Quiet, distance from noise, recovery. */
  rest: number;
  /** Being seen and counted. */
  standing: number;
}

export const NEUTRAL: Drives = {
  order: 0.5, service: 0.5, attention: 0.5, justice: 0.5, rest: 0.5, standing: 0.5,
};

/**
 * What just happened, as a character would perceive it. This is deliberately
 * coarse: an appraisal is not a physics report, it is what someone notices.
 */
export interface Situation {
  /** Something was upset, dropped, left out of place. */
  disorder: number;
  /** Someone present needs help and is not getting it. */
  unmetNeed: number;
  /** Something is being said or shown that this character holds to be false. */
  falsehood: number;
  /** Something worth listening to is happening right now. */
  worthHearing: number;
  /** Noise, crowd, pressure. */
  clamour: number;
  /** How long the character has been running hot without relief, 0 to 1. */
  strain: number;
}

export const CALM: Situation = {
  disorder: 0, unmetNeed: 0, falsehood: 0, worthHearing: 0, clamour: 0, strain: 0,
};

/** The responses a character can weigh. Deliberately few and human-sized. */
export type Response = 'tidy' | 'serve' | 'listen' | 'confront' | 'withdraw' | 'assert';

/**
 * How strongly a situation pulls on each response, per unit of the matching
 * drive. Read a row as: "wanting order makes tidying attractive when there is
 * disorder, and makes sitting still slightly unattractive."
 */
const PULL: Record<Response, (d: Drives, s: Situation) => number> = {
  tidy: (d, s) => d.order * s.disorder,
  serve: (d, s) => d.service * s.unmetNeed,
  listen: (d, s) => d.attention * s.worthHearing,
  confront: (d, s) => d.justice * s.falsehood,
  // resting is only attractive once someone is actually spent
  withdraw: (d, s) => d.rest * Math.max(s.strain - 0.4, 0) * 2 + d.rest * s.clamour * 0.3,
  assert: (d, s) => d.standing * (s.falsehood * 0.4 + s.disorder * 0.2),
};

export interface Appraisal {
  readonly response: Response;
  readonly utility: number;
  /** Everything considered, strongest first, for logs and for the inspector. */
  readonly ranked: readonly { response: Response; utility: number }[];
}

/**
 * Score every response and return the winner. Ties are resolved by the fixed
 * order of RESPONSES rather than at random, because a character that dithers
 * between two equal options every frame reads as broken rather than as torn.
 */
const RESPONSES: readonly Response[] = ['confront', 'tidy', 'serve', 'listen', 'withdraw', 'assert'];

export function appraise(drives: Drives, situation: Situation): Appraisal {
  const ranked = RESPONSES.map((response) => ({
    response,
    utility: Math.max(0, PULL[response](drives, situation)),
  })).sort((a, b) => b.utility - a.utility);

  const best = ranked[0] as { response: Response; utility: number };
  return { response: best.response, utility: best.utility, ranked };
}

/* ------------------------------------------------------------------ */
/* Profiles                                                            */
/* ------------------------------------------------------------------ */

export interface Profile {
  readonly id: string;
  readonly label: string;
  readonly drives: Drives;
  /** What breaks this character's normal state. */
  readonly trigger: string;
  /** Where it goes when the strain does not let up. */
  readonly breakingPoint: string;
  /** What brings it back. Never the same thing that broke it. */
  readonly resilience: string;
  readonly source: string;
}

export const MARTHA: Profile = {
  id: 'martha',
  label: 'Marthe',
  drives: { order: 0.95, service: 0.9, attention: 0.2, justice: 0.4, rest: 0.15, standing: 0.55 },
  trigger: 'anything out of place, and anyone sitting while work is undone',
  breakingPoint: 'she stops working to complain about who is not working',
  resilience: 'being told plainly that the thing she is anxious about is not the one that matters',
  source: 'LUK.10.40',
};

export const MARY: Profile = {
  id: 'mary',
  label: 'Marie',
  drives: { order: 0.15, service: 0.3, attention: 0.95, justice: 0.4, rest: 0.6, standing: 0.1 },
  trigger: 'something worth hearing, which outranks every task in the room',
  breakingPoint: 'she does not have one here; the pressure lands on the person beside her',
  resilience: 'not needed, and that is exactly what the other one cannot forgive',
  source: 'LUK.10.42',
};

export const ELIJAH: Profile = {
  id: 'elijah',
  label: 'Elie',
  drives: { order: 0.4, service: 0.35, attention: 0.4, justice: 0.98, rest: 0.5, standing: 0.6 },
  trigger: 'open injustice, or a crowd following someone it should not',
  breakingPoint: 'total collapse straight after the victory, and flight into isolation',
  resilience: 'sleep, food, silence, and a voice that is not in the wind or the fire',
  source: '1KI.19.12',
};

export const PROFILES: readonly Profile[] = [MARTHA, MARY, ELIJAH];

export function profile(id: string): Profile | undefined {
  return PROFILES.find((p) => p.id === id);
}

/**
 * Bridge for arcs: how appealing a given response is to this character right
 * now. Transitions use it to compete, so the same eligible options resolve
 * differently depending on who is standing there.
 */
export function appealOf(response: Response, drives: Drives, ctx: Context, situation: Situation): number {
  const base = PULL[response](drives, situation);
  // a frightened character reaches for withdrawal sooner than a calm one
  const fearBias = response === 'withdraw' ? ctx.disposition.fear * 0.4 : 0;
  return Math.max(0, base + fearBias);
}
