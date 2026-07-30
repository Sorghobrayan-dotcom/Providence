import type { Disposition, Directive } from '../providence/types';

/**
 * How the body carries what it feels, laid over what it is doing.
 *
 * The library decides where the character goes; this decides nothing. It reads
 * trust, fear and resolve and returns how the same walk should look — hunched
 * or upright, hurried or hesitant, squared up or turned away. Destination is
 * never touched here, because the moment presentation starts choosing targets
 * the tests stop describing what the player sees.
 *
 * This exists because fear was, until now, a bar in a sidebar. A character at
 * fear 0.9 under an imminent atrocity moved exactly like one at fear 0.0, which
 * is why every arc looked the same on screen no matter what it was feeling.
 *
 * It is a layer, not a pose: `applyPose` calls `resetLimbs` at the top of every
 * frame, so what is added here is wiped and recomputed cleanly next frame.
 */

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * Read a disposition the way the library actually produces it.
 *
 * This was the bug that made the whole layer invisible. Fear was mapped
 * linearly, and linear was calibrated against fear 0.95 — a value nothing in
 * the library reaches. Measured across all 24 arcs, starting fear is 0.1 to 0.2
 * with a single 0.5, and drift moves it by hundredths. So a linear map spent
 * almost its entire range on states that never happen and gave the states that
 * do happen about three degrees of lean, which reads as nothing at all.
 *
 * This curve spends its range where the simulation lives: 0.2 already carries
 * half the effect, and the top end saturates instead of being the only place
 * anything is visible.
 */
const felt = (n: number): number => Math.pow(clamp01(n), 0.45);

export interface Bearing {
  /** Forward pitch of the torso, radians. Fear hunches. */
  readonly hunch: number;
  /** Drop of the hips, metres. Fear lowers the centre of gravity. */
  readonly crouch: number;
  /** Head turned back over the shoulder, radians. Only while fleeing. */
  readonly glance: number;
  /** Torso turned off-square, radians. Distrust will not face you fully. */
  readonly avert: number;
  /** Fine tremor amplitude, metres. Only past real fear. */
  readonly tremor: number;
}

export const COMPOSED: Bearing = { hunch: 0, crouch: 0, glance: 0, avert: 0, tremor: 0 };

/** Below this much felt fear, it is tension rather than shaking. */
const TREMBLE_AT = 0.5;

export function bearingFor(
  disposition: Disposition,
  move: Directive['move'],
  clock: number,
): Bearing {
  const fear = felt(disposition.fear);
  const trust = clamp01(disposition.trust);

  // over the shoulder, and only when there is something behind worth checking
  const fleeing = move === 'away-from-player';
  const glance = fleeing ? fear * 0.8 * (0.5 + 0.5 * Math.sin(clock * 2.2)) : 0;

  return {
    hunch: fear * 0.34,
    crouch: fear * 0.15,
    glance,
    avert: felt(1 - trust) * 0.4,
    tremor: fear > TREMBLE_AT ? (fear - TREMBLE_AT) * 0.024 : 0,
  };
}

/**
 * How close it is willing to get, in metres.
 *
 * Two bodies were walking into each other and ending up as one figure, because
 * `toward-player` meant "reach the player's exact coordinates". Nobody does
 * that. Everyone has a distance they stop at, and how far out it is says
 * something: a companion who trusts you stands at your shoulder, and one who
 * does not keeps the length of a room between you.
 */
export function approachFor(disposition: Disposition, move: Directive['move']): number {
  const trust = clamp01(disposition.trust);
  if (move === 'toward-player') return 1.05 + felt(1 - trust) * 1.9;
  // the errand is a marker on the ground, so standing on its edge is arriving
  if (move === 'toward-errand') return 0.7;
  return 0;
}

/**
 * What the state does to the surface, rather than to the skeleton.
 *
 * A few degrees of lean is invisible across a viewport; a body that has gone
 * grey is not. This is the level the brief calls the visual — cleanliness,
 * withering, radiance — and it is the only channel that still reads when the
 * camera has pulled back to frame two people.
 */
export interface Countenance {
  /** Toward ash: colour drains as fear rises and trust fails. */
  readonly wither: number;
  /** Radiance. Resolve intact and trust given is what lights someone up. */
  readonly glow: number;
}

export function countenanceFor(disposition: Disposition): Countenance {
  const fear = felt(disposition.fear);
  const trust = clamp01(disposition.trust);
  const resolve = clamp01(disposition.resolve);

  return {
    wither: clamp01(fear * 0.72 + felt(1 - trust) * 0.28),
    glow: clamp01(resolve * trust) * 0.5,
  };
}

/**
 * How fast the body executes the directive it was given, as a multiplier.
 *
 * Still not a decision: the target is the library's, and this only says how
 * urgently the character goes there. Terror runs. Distrust approaches slowly.
 * A character whose resolve has collapsed keeps stopping and starting, which is
 * what low resolve looks like from outside — Jonah does not stroll to Tarshish,
 * he bolts, and he keeps faltering on the way to Nineveh.
 */
export function paceFor(
  disposition: Disposition,
  move: Directive['move'],
  clock: number,
): number {
  if (move === 'hold') return 0;

  const fear = felt(disposition.fear);
  const trust = clamp01(disposition.trust);
  const resolve = clamp01(disposition.resolve);

  let pace = 1;
  if (move === 'away-from-player' || move === 'away-from-errand') pace += fear * 0.7;
  if (move === 'toward-player') pace -= felt(1 - trust) * 0.4;

  /* Faltering. The threshold sits at two thirds rather than a half because the
     library's arcs sit at resolve 0.25 to 1: at a half, only the two most
     broken characters in the whole set ever visibly hesitate. */
  const doubt = clamp01((0.66 - resolve) * 1.6);
  pace *= 1 - doubt * 0.6 * Math.max(0, Math.sin(clock * 1.3));

  return Math.max(0.25, Math.min(1.9, pace));
}

/** The rig parts a bearing is laid over. */
export interface Carriage {
  readonly hips: { position: { y: number }; };
  readonly torso: { rotation: { x: number; y: number }; };
  readonly head: { rotation: { x: number; y: number }; };
}

/**
 * Add the bearing to a rig that has already been posed.
 *
 * Additive on purpose: `attack` twists the torso on Y and `dash` pitches it on
 * X, and a frightened character mid-attack should read as both at once rather
 * than as whichever ran last.
 */
export function carry(rig: Carriage, bearing: Bearing, hipsRest: number, clock: number): void {
  rig.torso.rotation.x += bearing.hunch;
  rig.torso.rotation.y += bearing.avert;
  rig.head.rotation.y += bearing.glance;
  // the head stays level as the chest folds, or the character walks face-down
  rig.head.rotation.x -= bearing.hunch * 0.65;
  rig.hips.position.y = hipsRest - bearing.crouch
    + (bearing.tremor > 0 ? Math.sin(clock * 34) * bearing.tremor : 0);
}
