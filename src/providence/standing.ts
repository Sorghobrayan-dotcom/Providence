import type { Disposition } from './types';

/**
 * Where a character stands, as opposed to how it feels.
 *
 * The mirror of covenant.ts. That module answers "what has the player done";
 * this one answers "what am I", and the two are deliberately not the same type:
 * a standing is owned by the character carrying it, and it moves for reasons
 * that have nothing to do with the player at all.
 *
 * Three things are kept apart here that a single "purity" number would flatten,
 * and flattening them would be wrong rather than merely coarse:
 *
 *   Defilement is ritual and temporary. It is contracted by contact, not by
 *   intent, and the text is explicit that it clears — washing, and unclean
 *   until evening. A man who buried his father is defiled and has done nothing
 *   wrong.
 *
 *   Blood guilt is moral and permanent. No rite touches it. The ground is said
 *   to hold the claim, which is why no amount of sacrifice moves it here.
 *
 *   Concealment is neither. It is a fact about who else knows, and it is the
 *   axis that actually drives behaviour: a defilement everyone can see costs
 *   almost nothing to carry, and the same defilement carried in secret costs
 *   something every second it stays secret.
 */

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export type Condition = 'blessed' | 'kept' | 'defiled' | 'cursed';

export type Rite = 'washing' | 'sacrifice' | 'restitution';

export interface Standing {
  /** Ritual defilement, 0..1. Contracted by contact; cleared by rite and time. */
  readonly defilement: number;
  /** Blood on the hands. Counted, never cleared by any rite. */
  readonly bloodGuilt: number;
  /** Standing gained by keeping the Law — the other direction from defilement. */
  readonly favour: number;
  /**
   * Nobody else knows. The single most behaviourally loaded field in the type:
   * a secret is not a smaller version of a known thing, it is a different thing
   * to carry.
   */
  readonly concealed: boolean;
  /** Seconds since the last rite, so 'unclean until evening' can be modelled. */
  readonly sinceRite: number;
  /** The passage this standing is read from. */
  readonly because: string;
}

export const UNDEFILED: Standing = {
  defilement: 0,
  bloodGuilt: 0,
  favour: 0,
  concealed: false,
  sinceRite: Infinity,
  because: 'PSA.24.4',
};

/** Contact with what the Law sets apart. Intent is not part of it. */
export function defile(s: Standing, amount: number, concealed = false): Standing {
  return {
    ...s,
    defilement: clamp01(s.defilement + amount),
    concealed: s.concealed || concealed,
    sinceRite: 0,
    because: 'LEV.11.24',
  };
}

/** Blood. Separate from defilement on purpose: no rite below will touch it. */
export function shedBlood(s: Standing, concealed = false): Standing {
  return {
    ...s,
    bloodGuilt: s.bloodGuilt + 1,
    concealed: s.concealed || concealed,
    because: 'GEN.4.10',
  };
}

/** The Law kept, in the open. The only thing that raises favour. */
export function keepLaw(s: Standing, amount = 0.2): Standing {
  return { ...s, favour: clamp01(s.favour + amount), because: 'PSA.15.2' };
}

/**
 * A rite. Clears what a rite can clear and no more.
 *
 * This is the whole reason blood is a separate field: a system where enough
 * sacrifice buys back anything is not modelling this text, and the refusal has
 * to live in the code rather than in a comment.
 */
export function atone(s: Standing, rite: Rite): Standing {
  const cleared =
    rite === 'sacrifice' ? 1
    : rite === 'washing' ? 0.6
    : 0.3;

  return {
    ...s,
    defilement: clamp01(s.defilement * (1 - cleared)),
    // a rite performed is a rite performed in front of someone
    concealed: s.bloodGuilt > 0 ? s.concealed : false,
    sinceRite: 0,
    because: rite === 'sacrifice' ? 'LEV.16.30' : rite === 'washing' ? 'LEV.15.13' : 'LEV.6.5',
  };
}

/** Time passing. Washing is not instant — the text says unclean until evening. */
export function elapse(s: Standing, dtSeconds: number): Standing {
  if (!Number.isFinite(s.sinceRite)) return s;
  return { ...s, sinceRite: s.sinceRite + dtSeconds };
}

export function conditionOf(s: Standing): Condition {
  if (s.bloodGuilt > 0) return 'cursed';
  if (s.defilement > 0.25) return 'defiled';
  if (s.favour > 0.5) return 'blessed';
  return 'kept';
}

/**
 * What it costs to keep it hidden, 0..1.
 *
 * The behaviour that makes a secret legible is not the secret, it is the
 * upkeep: a man with something to hide cannot afford to be looked at. Nothing
 * concealed means nothing to pay, however bad the standing is — grief in the
 * open is heavy but it is not this.
 */
export function strainOf(s: Standing): number {
  if (!s.concealed) return 0;
  return clamp01(s.bloodGuilt * 0.7 + s.defilement * 0.45);
}

/**
 * What the standing does to the disposition, per second.
 *
 * The signs invert on concealment, and that inversion is the point. Carried in
 * the open, a broken standing is grief: fear settles, resolve drains, and there
 * is no reason to distrust anyone. Carried in secret it is vigilance: fear
 * climbs and stays climbing, and trust falls, because everyone in the room is a
 * person who might find out.
 */
export function pressureOf(s: Standing): Partial<Disposition> {
  const strain = strainOf(s);

  if (strain > 0) {
    return { fear: 0.05 * strain, trust: -0.06 * strain, resolve: -0.02 * strain };
  }

  const condition = conditionOf(s);
  if (condition === 'cursed') return { resolve: -0.05, fear: 0.02 };
  if (condition === 'defiled') return { resolve: -0.02 };
  if (condition === 'blessed') return { resolve: 0.03, fear: -0.02 };
  return {};
}

/**
 * How the standing shows on the body, before any pose is applied.
 *
 * This is the level the brief calls the visual — cleanliness, withering,
 * radiance — and it belongs to standing rather than to mood, which is what was
 * wrong with computing it from fear. A frightened man is not a defiled one.
 */
export interface Aspect {
  /** Toward ash. Defilement and blood drain the surface. */
  readonly wither: number;
  /** Radiance. Only favour, in the open, lights anyone. */
  readonly glow: number;
  /**
   * How unsteady the radiance is, 0..1. A man keeping a secret still performs
   * being clean, and the performance is what flickers. Nothing else in the
   * engine flickers, so it reads immediately as something being held together.
   */
  readonly flicker: number;
}

export function aspectOf(s: Standing): Aspect {
  const strain = strainOf(s);
  return {
    wither: clamp01(s.defilement * 0.7 + Math.min(1, s.bloodGuilt) * 0.55),
    // a concealed man keeps up appearances, so the glow survives the secret
    glow: clamp01(s.favour - (s.concealed ? 0 : Math.min(1, s.bloodGuilt))) * 0.6,
    flicker: strain,
  };
}
