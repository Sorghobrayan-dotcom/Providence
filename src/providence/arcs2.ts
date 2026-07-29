import type { Arc } from './types';

/**
 * Second set of arcs. Where the first four define a relationship to the player,
 * these four define an INTERVENTION: something the NPC does to the player's own
 * course of action, whether the player wants it or not.
 */

/**
 * Balaam's donkey — the mount that sees what the rider does not, and refuses.
 * Numbers 22. This is the only arc in the library allowed to override player
 * input, and it is deliberate: the text is precisely about a creature obeying
 * something higher than its rider's command.
 */
export const BALAAMS_DONKEY: Arc = {
  id: 'balaams-donkey',
  label: "L'Anesse Qui Refuse",
  solves: 'Mounts and followers that walk into a wall because the player told them to.',
  source: 'NUM.22.23',
  initial: 'carrying',
  start: { trust: 0.7, fear: 0.2, resolve: 0.5 },
  nodes: [
    {
      id: 'carrying',
      directive: { move: 'toward-errand', posture: 'carrying' },
      transitions: [
        {
          to: 'seeing',
          when: (c) => c.world.dangerAhead,
          because: 'NUM.22.23',
          note: "l anesse voit ce que l homme ne voit pas",
        },
      ],
    },
    {
      id: 'seeing',
      directive: { move: 'hold', posture: 'balking' },
      drift: { fear: 0.1 },
      transitions: [
        {
          to: 'refusing',
          when: (c) => c.world.dangerAhead && c.world.timeInNode > 1,
          because: 'NUM.22.27',
          note: "elle se couche sous lui et ne veut plus avancer",
        },
        {
          to: 'carrying',
          when: (c) => !c.world.dangerAhead,
          because: 'NUM.22.23',
          note: 'la voie est libre, elle repart',
        },
      ],
    },
    {
      id: 'refusing',
      // the player pushes forward and the mount simply will not go
      directive: { move: 'hold', posture: 'lying-down', refusing: true, overridesInput: true },
      transitions: [
        {
          to: 'protesting',
          when: (c) => c.world.timeInNode > 3 && c.world.dangerAhead,
          because: 'NUM.22.28',
          note: "que t ai je fait pour que tu m aies frappee",
        },
        {
          to: 'carrying',
          when: (c) => !c.world.dangerAhead,
          because: 'NUM.22.35',
          note: 'le peril leve, elle se releve',
        },
      ],
    },
    {
      id: 'protesting',
      directive: { move: 'hold', posture: 'speaking', refusing: true, overridesInput: true },
      transitions: [
        {
          // the rider's eyes are opened and he finally sees the danger himself
          to: 'revealed',
          when: (c) => c.world.timeInNode > 2,
          because: 'NUM.22.31',
          note: 'alors ses yeux s ouvrent et il voit',
        },
      ],
    },
    {
      id: 'revealed',
      directive: { move: 'hold', posture: 'waiting' },
      transitions: [
        {
          to: 'carrying',
          when: (c) => !c.world.dangerAhead,
          because: 'NUM.22.35',
          note: 'va, mais ne dis que ce qui te sera dit',
        },
      ],
    },
  ],
};

/** Abigail — the one who puts her body between you and the thing you would regret. 1 Samuel 25. */
export const ABIGAIL: Arc = {
  id: 'abigail',
  label: "L Interposee",
  solves: 'Nobody in a game world ever tries to stop the player from doing something monstrous.',
  source: '1SA.25.18',
  initial: 'unaware',
  start: { trust: 0.5, fear: 0.3, resolve: 0.7 },
  nodes: [
    {
      id: 'unaware',
      directive: { move: 'hold', posture: 'occupied' },
      transitions: [
        {
          to: 'hastening',
          when: (c) => c.world.atrocityImminent,
          because: '1SA.25.18',
          note: 'elle se hate, sans rien dire a son mari',
        },
      ],
    },
    {
      id: 'hastening',
      directive: { move: 'toward-player', posture: 'hurrying' },
      transitions: [
        {
          to: 'interposing',
          when: (c) => c.world.distanceToPlayer < 4,
          because: '1SA.25.23',
          note: 'elle descend et se jette sur sa face devant lui',
        },
      ],
    },
    {
      id: 'interposing',
      // she does not fight and does not flee: she stands in the way
      directive: { move: 'hold', posture: 'prostrate', blocking: true },
      transitions: [
        {
          to: 'averted',
          when: (c) => !c.world.atrocityImminent,
          because: '1SA.25.33',
          note: "benie sois tu, qui m as empeche d en venir au sang",
        },
      ],
    },
    {
      id: 'averted',
      directive: { move: 'hold', posture: 'rising' },
      drift: { trust: 0.06 },
      transitions: [],
    },
  ],
};

/** The father of the prodigal — he never pursues. He watches the road. Luke 15. */
export const WATCHING_FATHER: Arc = {
  id: 'watching-father',
  label: 'Celui Qui Guette La Route',
  solves: 'Quest-givers that nag you to come back. This one waits, and the waiting is the point.',
  source: 'LUK.15.20',
  initial: 'watching',
  start: { trust: 0.9, fear: 0.1, resolve: 1 },
  nodes: [
    {
      id: 'watching',
      // he will not chase the player, ever. No reminder, no marker, no summons.
      directive: { move: 'hold', posture: 'watching-the-road' },
      transitions: [
        {
          to: 'sighting',
          when: (c) => c.world.playerReturning,
          because: 'LUK.15.20',
          note: 'comme il etait encore loin, son pere le vit',
        },
      ],
    },
    {
      id: 'sighting',
      directive: { move: 'hold', posture: 'moved' },
      transitions: [
        {
          to: 'running',
          when: () => true,
          because: 'LUK.15.20',
          note: 'il courut se jeter a son cou',
        },
      ],
    },
    {
      id: 'running',
      // the only moment in the whole arc where he moves
      directive: { move: 'toward-player', posture: 'running' },
      transitions: [
        {
          to: 'restoring',
          when: (c) => c.world.distanceToPlayer < 2,
          because: 'LUK.15.22',
          note: 'apportez la plus belle robe et l anneau',
        },
      ],
    },
    {
      id: 'restoring',
      directive: { move: 'hold', posture: 'restoring', effectOnPlayer: 'comfort' },
      transitions: [
        {
          to: 'watching',
          when: (c) => !c.world.playerReturning && c.world.timeInNode > 5,
          because: 'LUK.15.20',
          note: 'il reprend sa veille',
        },
      ],
    },
  ],
};

/** The unjust judge — grants nothing to merit, everything to persistence. Luke 18. */
export const UNJUST_JUDGE: Arc = {
  id: 'unjust-judge',
  label: 'Le Juge Lasse',
  solves: 'Gates opened by reputation or gold. This one opens only to someone who keeps coming back.',
  source: 'LUK.18.2',
  initial: 'dismissive',
  start: { trust: 0.1, fear: 0, resolve: 0.9 },
  nodes: [
    {
      id: 'dismissive',
      directive: { move: 'hold', posture: 'dismissive', refusing: true },
      transitions: [
        {
          to: 'wearied',
          when: (c) => c.world.requestsMade >= 4,
          because: 'LUK.18.5',
          note: "parce qu elle m importune, je lui ferai justice",
        },
      ],
    },
    {
      id: 'wearied',
      directive: { move: 'hold', posture: 'relenting' },
      transitions: [
        {
          to: 'granting',
          when: (c) => c.world.requestsMade >= 6,
          because: 'LUK.18.5',
          note: 'de peur qu elle ne vienne sans cesse me rompre la tete',
        },
      ],
    },
    {
      id: 'granting',
      directive: { move: 'hold', posture: 'granting' },
      transitions: [],
    },
  ],
};

/**
 * Job's friends — help that becomes harm the moment it opens its mouth.
 * Job 2:13 is the hinge: seven days of silence, and that silence was the only
 * comfort they ever gave.
 */
export const JOBS_FRIENDS: Arc = {
  id: 'jobs-friends',
  label: 'Les Consolateurs',
  solves: 'Allies whose help is always positive. These become harmful, and only by speaking.',
  source: 'JOB.2.11',
  initial: 'coming',
  start: { trust: 0.6, fear: 0.2, resolve: 0.6 },
  nodes: [
    {
      id: 'coming',
      directive: { move: 'toward-player', posture: 'approaching' },
      transitions: [
        {
          to: 'silent',
          when: (c) => c.world.distanceToPlayer < 3 && c.world.playerSuffering,
          because: 'JOB.2.13',
          note: 'ils resterent sept jours a terre sans lui dire un mot',
        },
      ],
    },
    {
      id: 'silent',
      // the only genuinely helpful state in the entire arc
      directive: { move: 'hold', posture: 'sitting-with', effectOnPlayer: 'comfort' },
      transitions: [
        {
          to: 'speaking',
          when: (c) => c.world.timeInNode > 7,
          because: 'JOB.4.1',
          note: 'alors Eliphaz prit la parole',
        },
      ],
    },
    {
      id: 'speaking',
      directive: { move: 'hold', posture: 'explaining', effectOnPlayer: 'harm' },
      drift: { trust: -0.05 },
      transitions: [
        {
          to: 'accusing',
          when: (c) => c.world.timeInNode > 6,
          because: 'JOB.22.5',
          note: 'ta mechancete n est elle pas grande',
        },
        {
          to: 'silent',
          when: (c) => !c.world.playerSuffering,
          because: 'JOB.2.13',
          note: 'ils se taisent de nouveau',
        },
      ],
    },
    {
      id: 'accusing',
      directive: { move: 'hold', posture: 'accusing', effectOnPlayer: 'harm' },
      drift: { trust: -0.08 },
      transitions: [],
    },
  ],
};

export const INTERVENTION_ARCS: readonly Arc[] = [
  BALAAMS_DONKEY,
  ABIGAIL,
  WATCHING_FATHER,
  UNJUST_JUDGE,
  JOBS_FRIENDS,
];
