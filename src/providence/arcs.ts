import type { Arc } from './types';

/**
 * Four arcs, chosen because each defines a different RELATIONSHIP to the player:
 * the giver who runs from his own errand, the ally whose loyalty can break and
 * be repaired, the companion who binds herself unasked, and the enemy who spares
 * you when he does not have to.
 */

/** Jonah — the quest-giver who flees his own quest. Jonah 1 to 4. */
export const JONAH: Arc = {
  id: 'jonah',
  label: 'Le Réticent',
  solves: 'Quest-givers that stand in one spot forever. This one runs from the errand you gave him.',
  source: 'JON.1',
  initial: 'commissioned',
  start: { trust: 0.5, fear: 0.3, resolve: 0.25 },
  nodes: [
    {
      id: 'commissioned',
      directive: { move: 'hold', posture: 'burdened' },
      transitions: [
        {
          to: 'fleeing',
          when: (c) => c.disposition.resolve < 0.4 && c.world.errand !== null,
          because: 'JON.1.3',
          note: 'il se leve pour fuir loin de sa mission',
        },
        {
          to: 'obeying',
          when: (c) => c.disposition.resolve >= 0.6,
          because: 'JON.3.3',
          note: 'il se met en route',
        },
      ],
    },
    {
      id: 'fleeing',
      // he does not idle, he actively increases the distance to his own objective
      directive: { move: 'away-from-errand', posture: 'fleeing', refusing: true },
      drift: { fear: 0.05 },
      transitions: [
        {
          to: 'caught',
          when: (c) => c.disposition.fear > 0.75,
          because: 'JON.1.4',
          note: 'la tempete se leve, la fuite se ferme',
        },
      ],
    },
    {
      id: 'caught',
      directive: { move: 'hold', posture: 'held' },
      drift: { resolve: 0.12, fear: -0.06 },
      transitions: [
        {
          to: 'returning',
          when: (c) => c.disposition.resolve > 0.55,
          because: 'JON.2.10',
          note: 'il est rendu a la terre ferme',
        },
      ],
    },
    {
      id: 'returning',
      directive: { move: 'toward-errand', posture: 'resigned' },
      transitions: [
        {
          to: 'obeying',
          when: (c) => c.world.distanceToPlayer < 3,
          because: 'JON.3.3',
          note: 'il accomplit enfin ce qui lui fut dit',
        },
      ],
    },
    {
      id: 'obeying',
      directive: { move: 'toward-errand', posture: 'proclaiming' },
      transitions: [
        {
          // Jonah 4 is the part everyone forgets: he obeys and he is furious
          to: 'sulking',
          when: (c) => c.world.timeInNode > 6,
          because: 'JON.4.1',
          note: 'la chose lui deplait, il se fache',
        },
      ],
    },
    {
      id: 'sulking',
      directive: { move: 'away-from-player', posture: 'bitter' },
      drift: { trust: -0.03 },
      transitions: [],
    },
  ],
};

/** Peter — loyalty that breaks under pressure and can be restored. Luke 22, John 21. */
export const PETER: Arc = {
  id: 'peter',
  label: 'Le Serment Brise',
  solves: 'Loyalty bars that only ever go up or down. This one snaps, then mends higher than before.',
  source: 'LUK.22.33',
  initial: 'following',
  start: { trust: 0.85, fear: 0.1, resolve: 0.9 },
  nodes: [
    {
      id: 'following',
      directive: { move: 'toward-player', posture: 'sworn', companion: true },
      transitions: [
        {
          to: 'pressed',
          when: (c) => c.world.underThreat,
          because: 'LUK.22.54',
          note: 'il suit de loin',
        },
      ],
    },
    {
      id: 'pressed',
      directive: { move: 'hold', posture: 'wary', companion: true },
      drift: { fear: 0.09, trust: -0.02 },
      transitions: [
        {
          // it took a great deal to break him the first time. It takes less
          // afterwards, which is what a scar is
          to: 'denying',
          when: (c) => c.disposition.fear > Math.max(0.2, 0.7 - c.scars * 0.25),
          because: 'LUK.22.57',
          note: 'femme, je ne le connais pas',
        },
        {
          to: 'following',
          when: (c) => !c.world.underThreat && c.disposition.fear < 0.3,
          because: 'LUK.22.33',
          note: 'la menace passe, il revient pres de toi',
        },
      ],
    },
    {
      id: 'denying',
      // he does not merely stop helping, he denies knowing the player at all
      directive: { move: 'away-from-player', posture: 'denying', refusing: true },
      drift: { trust: -0.12 },
      transitions: [
        {
          to: 'weeping',
          when: (c) => !c.world.underThreat,
          because: 'LUK.22.62',
          note: 'il sort et pleure amerement',
        },
      ],
    },
    {
      id: 'weeping',
      // unavailable: the player cannot simply pay or persuade him back
      directive: { move: 'hold', posture: 'withdrawn' },
      drift: { fear: -0.08 },
      transitions: [
        {
          /* Three kindnesses, plus two more for every betrayal standing in the
             record. A man who has been sold once does not come back on the same
             terms, and the graph is what remembers it, not a flag we set. */
          to: 'restored',
          when: (c) => c.world.kindnessesWitnessed >= 3 + c.memory.betrayals * 2,
          because: 'JHN.21.17',
          note: 'trois fois demande, trois fois rendu',
        },
      ],
    },
    {
      id: 'restored',
      directive: { move: 'toward-player', posture: 'steadfast', companion: true },
      drift: { trust: 0.04 },
      transitions: [
        {
          /* Restoration is not immunity. He can be put in the same room again,
             and the wound he already carries is what makes the second time
             quicker than the first. */
          to: 'pressed',
          when: (c) => c.world.underThreat,
          because: 'LUK.22.54',
          note: 'il suit de loin, une fois de plus',
        },
      ],
    },
  ],
};

/** Ruth — the companion who is never recruited. Ruth 1. */
export const RUTH: Arc = {
  id: 'ruth',
  label: 'Celle Qui Choisit',
  solves: 'Companions you hire or unlock. This one watches you first, then binds herself, and will not be sent away.',
  source: 'RUT.1.16',
  initial: 'stranger',
  start: { trust: 0.2, fear: 0.2, resolve: 0.5 },
  nodes: [
    {
      id: 'stranger',
      directive: { move: 'hold', posture: 'apart' },
      transitions: [
        {
          to: 'watching',
          when: (c) => c.world.distanceToPlayer < 12,
          because: 'RUT.2.11',
          note: 'on lui a rapporte tout ce que tu as fait',
        },
      ],
    },
    {
      id: 'watching',
      // she is not recruitable here; only what the player does moves her
      directive: { move: 'hold', posture: 'observing' },
      transitions: [
        {
          /* She binds on what she saw you do, and no amount of kindness aimed at
             her will move her if you have hurt her household. The whole point of
             the character is that she is not bought. */
          to: 'binding',
          when: (c) => c.world.kindnessesWitnessed >= 2 && !c.memory.harmedMyHouse,
          because: 'RUT.1.16',
          note: 'ou tu iras j irai',
        },
      ],
    },
    {
      id: 'binding',
      directive: { move: 'toward-player', posture: 'binding', companion: true },
      drift: { trust: 0.1 },
      transitions: [
        {
          to: 'steadfast',
          when: (c) => c.disposition.trust > 0.8,
          because: 'RUT.1.17',
          note: 'que la mort seule me separe de toi',
        },
      ],
    },
    {
      id: 'steadfast',
      // dismissal is refused: the arc has no exit
      directive: { move: 'toward-player', posture: 'steadfast', companion: true },
      transitions: [],
    },
  ],
};

/** David in the cave — the enemy who has you and lets you live. 1 Samuel 24. */
export const DAVID_IN_THE_CAVE: Arc = {
  id: 'david-cave',
  label: 'La Retenue',
  solves: 'Enemies that always strike when they can. This one has you, and lowers the blade.',
  source: '1SA.24.6',
  initial: 'hunting',
  start: { trust: 0.1, fear: 0.2, resolve: 0.8 },
  nodes: [
    {
      id: 'hunting',
      directive: { move: 'toward-player', posture: 'hunting' },
      transitions: [
        {
          to: 'advantage',
          when: (c) => c.world.hasLethalAdvantage,
          because: '1SA.24.4',
          note: 'voici le jour ou ton ennemi est livre entre tes mains',
        },
      ],
    },
    {
      id: 'advantage',
      directive: { move: 'hold', posture: 'blade-raised' },
      // grievance hardens him: the resolve to strike decays more slowly
      drift: { resolve: -0.2 },
      transitions: [
        {
          /* He lowers the blade because nothing was owed against him. Touch his
             house and the same moment plays out differently. */
          to: 'restraint',
          when: (c) => c.disposition.resolve < 0.45 && !c.memory.harmedMyHouse,
          because: '1SA.24.6',
          note: 'son coeur le reprend, il ne frappe pas',
        },
      ],
    },
    {
      id: 'restraint',
      // he withdraws, and leaves proof he could have killed and did not
      directive: { move: 'away-from-player', posture: 'withdrawing' },
      transitions: [
        {
          to: 'proof',
          when: (c) => c.world.distanceToPlayer > 8,
          because: '1SA.24.11',
          note: 'vois le pan de ton manteau dans ma main',
        },
      ],
    },
    {
      id: 'proof',
      directive: { move: 'hold', posture: 'showing-proof' },
      drift: { trust: 0.05 },
      transitions: [],
    },
  ],
};

import { INTERVENTION_ARCS } from './arcs2';
import { ADVERSARY_ARCS, FURTHER_ARCS } from './adversaries';
import { MOTIVATED_ARCS } from './motivated';

/** How an NPC stands toward the player. */
export const RELATIONSHIP_ARCS: readonly Arc[] = [JONAH, PETER, RUTH, DAVID_IN_THE_CAVE];

export const LIBRARY: readonly Arc[] = [
  ...RELATIONSHIP_ARCS,
  ...INTERVENTION_ARCS,
  ...ADVERSARY_ARCS,
  ...FURTHER_ARCS,
  ...MOTIVATED_ARCS,
];

export function findArc(id: string): Arc | undefined {
  return LIBRARY.find((a) => a.id === id);
}
