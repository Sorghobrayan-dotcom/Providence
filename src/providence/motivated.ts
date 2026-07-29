import type { Arc, Context } from './types';
import { appraise, ELIJAH, MARTHA, MARY, type Drives, type Situation } from './drives';

/**
 * Arcs whose transitions are chosen by pull rather than by order.
 *
 * Each one follows the same four layers: what breaks the normal state, what the
 * character does first, where it goes if the strain never lets up, and what
 * brings it back. The last layer matters most and is the one games skip: a
 * character that can break and never recover is not deep, it is broken.
 *
 * Martha and Mary share a room and a situation. Nothing distinguishes their
 * arcs except the drives, and that is the whole demonstration.
 */

/** The host game fills this in. Everything below reads it through the drives. */
export interface MotivatedWorld {
  readonly situation: Situation;
}

/** Where a character's reading of the room is stashed on the context. */
const situationOf = (ctx: Context): Situation => ctx.world.situation ?? {
  disorder: 0, unmetNeed: 0, falsehood: 0, worthHearing: 0, clamour: 0, strain: 0,
};

const pull = (drives: Drives, response: Parameters<typeof appraise> extends never ? never : string) =>
  (ctx: Context): number => {
    const ranked = appraise(drives, situationOf(ctx)).ranked;
    return ranked.find((r) => r.response === response)?.utility ?? 0;
  };

/* ------------------------------------------------------------------ */

/** Martha. Order and service, and no tolerance at all for someone sitting. */
export const MARTHA_ARC: Arc = {
  id: 'martha',
  label: 'Marthe',
  solves: 'NPCs that react to an event because the designer wired that event to that reaction.',
  source: 'LUK.10.40',
  initial: 'working',
  start: { trust: 0.7, fear: 0.15, resolve: 0.8 },
  nodes: [
    {
      id: 'working',
      directive: { move: 'toward-errand', posture: 'busy' },
      transitions: [
        {
          // trigger: something out of place
          to: 'tidying',
          when: (c) => situationOf(c).disorder > 0.2,
          appeal: pull(MARTHA.drives, 'tidy'),
          because: 'LUK.10.40',
          note: 'elle est absorbee par les nombreux soins du service',
        },
        {
          to: 'listening',
          when: (c) => situationOf(c).worthHearing > 0.2,
          appeal: pull(MARTHA.drives, 'listen'),
          because: 'LUK.10.39',
          note: 'elle pourrait s asseoir, mais l ouvrage la tient',
        },
      ],
    },
    {
      id: 'tidying',
      directive: { move: 'toward-errand', posture: 'setting-right' },
      drift: { fear: 0.04 },
      transitions: [
        {
          // breaking point: she stops the work to complain about the work
          to: 'complaining',
          when: (c) => situationOf(c).strain > 0.6,
          because: 'LUK.10.40',
          note: 'ne t inquietes tu pas de ce que ma soeur me laisse seule',
        },
        {
          to: 'working',
          when: (c) => situationOf(c).disorder < 0.1,
          because: 'LUK.10.40',
          note: 'la chose est remise a sa place',
        },
      ],
    },
    {
      id: 'listening',
      directive: { move: 'toward-player', posture: 'attending' },
      transitions: [
        {
          // she cannot hold it: any disorder pulls her straight back out
          to: 'tidying',
          when: (c) => situationOf(c).disorder > 0.15,
          appeal: pull(MARTHA.drives, 'tidy'),
          because: 'LUK.10.40',
          note: 'le moindre desordre la fait relever',
        },
      ],
    },
    {
      id: 'complaining',
      directive: { move: 'toward-player', posture: 'protesting', refusing: true },
      transitions: [
        {
          /* resilience: not rest, and not help with the chores. Being told the
             thing she is anxious about is not the thing that matters. */
          to: 'settled',
          when: (c) => situationOf(c).worthHearing > 0.7 && situationOf(c).clamour < 0.3,
          because: 'LUK.10.42',
          note: 'une seule chose est necessaire',
        },
      ],
    },
    {
      id: 'settled',
      directive: { move: 'hold', posture: 'still', companion: true },
      drift: { fear: -0.06 },
      transitions: [
        {
          to: 'working',
          when: (c) => situationOf(c).unmetNeed > 0.5,
          because: 'LUK.10.40',
          note: 'le service reprend, sans l angoisse',
        },
      ],
    },
  ],
};

/** Mary. Same room, same interruption, opposite pull. */
export const MARY_ARC: Arc = {
  id: 'mary',
  label: 'Marie',
  solves: 'Two NPCs in one room reacting identically because reactions are wired to events.',
  source: 'LUK.10.39',
  initial: 'working',
  start: { trust: 0.7, fear: 0.15, resolve: 0.8 },
  nodes: [
    {
      id: 'working',
      directive: { move: 'toward-errand', posture: 'busy' },
      transitions: [
        {
          to: 'tidying',
          when: (c) => situationOf(c).disorder > 0.2,
          appeal: pull(MARY.drives, 'tidy'),
          because: 'LUK.10.40',
          note: 'le desordre ne la retient pas longtemps',
        },
        {
          to: 'listening',
          when: (c) => situationOf(c).worthHearing > 0.2,
          appeal: pull(MARY.drives, 'listen'),
          because: 'LUK.10.39',
          note: 'elle s assit aux pieds du Seigneur, et ecoutait',
        },
      ],
    },
    {
      id: 'tidying',
      directive: { move: 'toward-errand', posture: 'setting-right' },
      transitions: [
        {
          to: 'listening',
          when: (c) => situationOf(c).worthHearing > 0.2,
          appeal: pull(MARY.drives, 'listen'),
          because: 'LUK.10.39',
          note: 'elle laisse la tache',
        },
      ],
    },
    {
      id: 'listening',
      // nothing in the room moves her, which is the entire character
      directive: { move: 'hold', posture: 'attending', companion: true },
      transitions: [
        {
          to: 'tidying',
          when: (c) => situationOf(c).disorder > 0.85,
          appeal: pull(MARY.drives, 'tidy'),
          because: 'LUK.10.40',
          note: 'seul un desordre extreme la fait bouger',
        },
      ],
    },
  ],
};

/**
 * Elijah. The four layers at their sharpest: he wins outright and collapses
 * immediately afterwards, and what brings him back is food, sleep and a voice
 * that is not in the wind or the fire. 1 Kings 18 and 19.
 */
export const ELIJAH_ARC: Arc = {
  id: 'elijah',
  label: 'Elie',
  solves: 'Heroes that are fine after the boss dies. This one breaks after winning, not after losing.',
  source: '1KI.18.21',
  initial: 'watching',
  start: { trust: 0.5, fear: 0.1, resolve: 0.95 },
  nodes: [
    {
      id: 'watching',
      directive: { move: 'hold', posture: 'watching' },
      transitions: [
        {
          // trigger: a crowd following what it should not
          to: 'confronting',
          when: (c) => situationOf(c).falsehood > 0.35,
          appeal: pull(ELIJAH.drives, 'confront'),
          because: '1KI.18.21',
          note: 'jusqu a quand clocherez vous des deux cotes',
        },
      ],
    },
    {
      id: 'confronting',
      directive: { move: 'toward-player', posture: 'challenging', hostile: false },
      drift: { fear: 0.05 },
      transitions: [
        {
          to: 'spent',
          when: (c) => situationOf(c).strain > 0.55,
          appeal: pull(ELIJAH.drives, 'withdraw'),
          because: '1KI.19.4',
          note: 'c est assez, prends mon ame',
        },
        {
          to: 'watching',
          when: (c) => situationOf(c).falsehood < 0.15,
          because: '1KI.18.39',
          note: 'le peuple se prosterne, il se tait',
        },
      ],
    },
    {
      id: 'spent',
      // breaking point: he does not rage, he stops
      directive: { move: 'away-from-player', posture: 'fleeing' },
      drift: { resolve: -0.15 },
      transitions: [
        {
          to: 'hidden',
          when: (c) => c.world.distanceToPlayer > 14,
          because: '1KI.19.9',
          note: 'il entra dans la caverne',
        },
      ],
    },
    {
      id: 'hidden',
      directive: { move: 'hold', posture: 'withdrawn' },
      drift: { fear: -0.05 },
      transitions: [
        {
          /* Resilience, and the shape of it is the point: not a rousing speech,
             not another victory. Quiet, and only quiet. */
          to: 'restored',
          when: (c) => situationOf(c).clamour < 0.15 && c.world.timeInNode > 6,
          because: '1KI.19.12',
          note: 'un murmure doux et leger',
        },
      ],
    },
    {
      id: 'restored',
      directive: { move: 'toward-player', posture: 'steady', companion: true },
      drift: { resolve: 0.08 },
      transitions: [
        {
          to: 'confronting',
          when: (c) => situationOf(c).falsehood > 0.6,
          appeal: pull(ELIJAH.drives, 'confront'),
          because: '1KI.19.15',
          note: 'va, reprends ton chemin',
        },
      ],
    },
  ],
};

export const MOTIVATED_ARCS: readonly Arc[] = [MARTHA_ARC, MARY_ARC, ELIJAH_ARC];
