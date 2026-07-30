import type { Drives, Situation } from './drives';
import type { Disposition } from './types';

/**
 * Where a scene happens changes what happens in it.
 *
 * The places module answers who may enter and where safety sits. This answers
 * something else: a room presses on the people standing in it. The same two
 * characters, the same errand, put in a palace and in a desert, should not
 * behave the same way, and until now nothing in the engine could express that.
 *
 * An atmosphere does two things. It sets a floor under what the room is already
 * doing (a palace is never quiet, a desert is never loud), and it leans on
 * certain drives, because a place makes some wants easier to feel than others.
 */

export interface Atmosphere {
  readonly id: string;
  readonly label: string;
  /** What the room contributes before anyone does anything. */
  readonly ambient: Partial<Situation>;
  /** Multipliers on each drive. 1 leaves a want untouched. */
  readonly leans: Partial<Drives>;
  /**
   * Per second pressure on the disposition of anyone standing here.
   *
   * This is what lets a place reach every arc rather than only the three built
   * on drives. Fear, resolve and trust are read by all twenty four, so a room
   * that frightens people frightens Peter and the donkey alike, without either
   * arc knowing that atmospheres exist.
   */
  readonly weighs?: Partial<Disposition>;
  readonly source: string;
  readonly note: string;
}

/** Nothing. Useful as a control in a simulation. */
export const NOWHERE: Atmosphere = {
  id: 'nowhere',
  label: 'Nulle part',
  ambient: {},
  leans: {},
  source: 'GEN.1.2',
  note: 'a room with no character of its own',
};

export const DREAD: Atmosphere = {
  id: 'dread',
  label: 'L Effroi',
  ambient: { clamour: 0.35, strain: 0.5 },
  leans: { rest: 1.5, standing: 0.3, attention: 0.7 },
  // the room itself does the frightening; nothing has to happen
  weighs: { fear: 0.07, resolve: -0.03 },
  source: 'NUM.22.23',
  note: 'where a beast sees what its rider does not, and will not go on',
};

export const DESERT: Atmosphere = {
  id: 'desert',
  label: 'Le Desert',
  // nothing to tidy, nobody to impress, and the strain never stops climbing
  ambient: { disorder: 0, clamour: 0.05, strain: 0.35 },
  leans: { order: 0.3, standing: 0.2, rest: 1.6, attention: 1.4, justice: 1.1 },
  weighs: { fear: -0.02, resolve: -0.02 },
  source: '1KI.19.4',
  note: 'where a man asks to die, and where he is answered quietly',
};

export const PALACE: Atmosphere = {
  id: 'palace',
  label: 'Le Palais',
  // noise, an audience, and everything visibly in or out of its place
  ambient: { clamour: 0.55, disorder: 0.25, worthHearing: 0.15 },
  leans: { standing: 1.7, order: 1.4, service: 1.2, rest: 0.4, attention: 0.6 },
  weighs: { fear: 0.02, resolve: 0.02 },
  source: '1SA.18.6',
  note: 'where women sing your rival s name and a king counts the numbers',
};

export const HOUSEHOLD: Atmosphere = {
  id: 'household',
  label: 'La Maison',
  ambient: { unmetNeed: 0.4, disorder: 0.3, worthHearing: 0.5 },
  leans: { service: 1.3, order: 1.2, attention: 1.1, standing: 0.7 },
  source: 'LUK.10.38',
  note: 'a guest is here, the work is not done, and both facts are true at once',
};

export const TEMPLE: Atmosphere = {
  id: 'temple',
  label: 'Le Temple',
  ambient: { worthHearing: 0.6, clamour: 0.2 },
  leans: { attention: 1.5, order: 1.3, justice: 1.4, standing: 0.5, rest: 0.8 },
  weighs: { fear: -0.03, resolve: 0.03 },
  source: 'EXO.26.33',
  note: 'graduated ground, where what you are decides how far in you stand',
};

export const ROAD: Atmosphere = {
  id: 'road',
  label: 'La Route',
  ambient: { clamour: 0.25, strain: 0.15 },
  leans: { rest: 1.2, attention: 1.1, order: 0.6 },
  source: 'LUK.10.31',
  note: 'where most pass by on the other side',
};

export const ATMOSPHERES: readonly Atmosphere[] = [NOWHERE, DREAD, DESERT, PALACE, HOUSEHOLD, TEMPLE, ROAD];

export function atmosphere(id: string): Atmosphere | undefined {
  return ATMOSPHERES.find((a) => a.id === id);
}

/** The room's floor, under whatever the scene is already doing. */
export function colour(place: Atmosphere, scene: Situation): Situation {
  const out = { ...scene };
  for (const key of Object.keys(place.ambient) as (keyof Situation)[]) {
    const floor = place.ambient[key] ?? 0;
    out[key] = Math.min(1, Math.max(out[key], floor));
  }
  return out;
}

/** How a place leans on what someone wants while they are standing in it. */
export function press(place: Atmosphere, drives: Drives): Drives {
  const out = { ...drives };
  for (const key of Object.keys(place.leans) as (keyof Drives)[]) {
    out[key] = Math.min(1, out[key] * (place.leans[key] ?? 1));
  }
  return out;
}
