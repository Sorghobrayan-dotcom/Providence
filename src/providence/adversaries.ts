import type { Arc } from './types';

/**
 * Providence, the adversaries.
 *
 * Game villains attack. That is nearly the whole vocabulary the industry has:
 * a health bar walks toward you and swings. Scripture's antagonists barely
 * fight at all. They suggest, they concede and renege, they envy you for
 * succeeding, they freeze an army without lifting a sword, they use the law
 * itself, and one of them quotes the text back at you correctly.
 *
 * Each arc here is written so the danger is something a health bar cannot model.
 */

/** The serpent — never attacks. Asks a question, and reframes a limit as a theft. Genesis 3. */
export const SERPENT: Arc = {
  id: 'serpent',
  label: 'Celui Qui Suggere',
  solves: 'Villains whose only verb is attack. This one never fights, and it is the most dangerous in the library.',
  source: 'GEN.3.1',
  initial: 'coiled',
  start: { trust: 0.4, fear: 0, resolve: 0.9 },
  nodes: [
    {
      id: 'coiled',
      /* It closes rather than waits. Holding here made it a trap the player had
         to walk into, and left the flanking way written for it in ways.ts
         unreachable - the one thing it does, arrive from an angle you were not
         watching, could never happen. */
      directive: { move: 'toward-player', posture: 'watching' },
      transitions: [
        {
          /* It comes closer, sooner, to someone already carrying a grievance.
             Nothing in the arc says "target the wounded"; it falls out of
             reading the graph. */
          to: 'questioning',
          when: (c) => c.world.distanceToPlayer < (c.memory.grievance > 0 ? 12 : 6),
          because: 'GEN.3.1',
          note: 'dieu a t il reellement dit',
        },
      ],
    },
    {
      id: 'questioning',
      // it does not lie yet, it only asks whether the rule is really the rule,
      // and it is still closing while it asks
      directive: { move: 'toward-player', posture: 'questioning', offering: true },
      transitions: [
        {
          to: 'reframing',
          when: (c) => c.world.timeInNode > 3,
          because: 'GEN.3.4',
          note: 'vous ne mourrez point',
        },
      ],
    },
    {
      id: 'reframing',
      // the offer is genuinely attractive, which is the whole mechanic
      directive: { move: 'hold', posture: 'offering', offering: true },
      drift: { trust: 0.04 },
      transitions: [
        {
          to: 'withdrawn',
          when: (c) => c.world.timeInNode > 6,
          because: 'GEN.3.6',
          note: 'elle prit du fruit, et il se retire',
        },
      ],
    },
    {
      id: 'withdrawn',
      // it leaves the moment the player acts, and is never there for the consequence
      directive: { move: 'away-from-player', posture: 'gone' },
      transitions: [
        {
          /* And it comes back. A tempter that suggests once and is done for the
             session is a cutscene; this one returns the moment there is enough
             distance to approach across again, which is what makes it a
             presence in the world rather than an event in it. */
          to: 'coiled',
          when: (c) => c.world.distanceToPlayer > 10,
          because: 'LUK.4.13',
          note: 'le diable se retira de lui jusqu a un moment favorable',
        },
      ],
    },
  ],
};

/** Pharaoh — concedes under pressure, reneges the instant it lifts. Exodus 5 to 14. */
export const PHARAOH: Arc = {
  id: 'pharaoh',
  label: 'La Reddition Fausse',
  solves: 'Bosses that surrender once and stay surrendered. This one yields, then takes it back, again and again.',
  source: 'EXO.8.15',
  initial: 'refusing',
  start: { trust: 0.1, fear: 0.1, resolve: 0.95 },
  nodes: [
    {
      id: 'refusing',
      directive: { move: 'hold', posture: 'enthroned', hostile: true, refusing: true },
      transitions: [
        {
          to: 'relenting',
          when: (c) => c.world.underPressure,
          because: 'EXO.8.8',
          note: 'priez, et je laisserai aller le peuple',
        },
      ],
    },
    {
      id: 'relenting',
      directive: { move: 'hold', posture: 'conceding' },
      transitions: [
        {
          // the hinge of the whole arc: relief is what makes him harden
          to: 'hardening',
          when: (c) => !c.world.underPressure,
          because: 'EXO.8.15',
          note: 'pharaon vit qu il y avait du relache, et il endurcit son coeur',
        },
      ],
    },
    {
      id: 'hardening',
      directive: { move: 'hold', posture: 'hardened', hostile: true, refusing: true },
      drift: { resolve: 0.06 },
      transitions: [
        {
          to: 'relenting',
          when: (c) => c.world.underPressure,
          because: 'EXO.9.27',
          note: 'cette fois j ai peche',
        },
        {
          to: 'pursuing',
          when: (c) => c.disposition.resolve > 0.95 && c.world.distanceToPlayer > 20,
          because: 'EXO.14.8',
          note: 'il poursuivit les enfants d israel',
        },
      ],
    },
    {
      id: 'pursuing',
      // he breaks the last truce and chases even after letting them go
      directive: { move: 'toward-player', posture: 'charioteering', hostile: true },
      transitions: [],
    },
  ],
};

/** Saul — the patron who turns on you because you succeed. 1 Samuel 18. */
export const SAUL: Arc = {
  id: 'saul',
  label: 'Le Patron Jaloux',
  solves: 'Quest-givers that reward you forever. This one becomes hostile precisely because you did well.',
  source: '1SA.18.9',
  initial: 'favouring',
  start: { trust: 0.8, fear: 0.2, resolve: 0.6 },
  nodes: [
    {
      id: 'favouring',
      directive: { move: 'toward-player', posture: 'favouring' },
      transitions: [
        {
          /* Renown is enough on its own, and holding something that was his
             makes it immediate. */
          to: 'eyeing',
          when: (c) => c.world.playerSucceeding || c.memory.tookWhatWasMine,
          because: '1SA.18.7',
          note: 'saul a tue ses mille, et david ses dix mille',
        },
      ],
    },
    {
      id: 'eyeing',
      // no hostility yet, only a look. The player usually misses this state.
      directive: { move: 'hold', posture: 'eyeing' },
      drift: { trust: -0.08 },
      transitions: [
        {
          to: 'striking',
          when: (c) => c.disposition.trust < 0.35,
          because: '1SA.18.11',
          note: 'saul lanca la lance',
        },
        {
          to: 'favouring',
          when: (c) => !c.world.playerSucceeding && c.disposition.trust > 0.6,
          because: '1SA.18.5',
          note: 'la faveur revient tant qu il ne te craint pas',
        },
      ],
    },
    {
      id: 'striking',
      directive: { move: 'toward-player', posture: 'hurling', hostile: true },
      transitions: [
        {
          to: 'hunting',
          when: (c) => c.world.distanceToPlayer > 10,
          because: '1SA.19.10',
          note: 'david s enfuit, et saul le poursuit',
        },
      ],
    },
    {
      id: 'hunting',
      directive: { move: 'toward-player', posture: 'hunting', hostile: true },
      transitions: [],
    },
  ],
};

/** Goliath — freezes an entire army without striking anyone. 1 Samuel 17. */
export const GOLIATH: Arc = {
  id: 'goliath',
  label: "Celui Qui Petrifie",
  solves: 'Bosses that fight your party. This one suppresses it and waits, and the fight never starts.',
  source: '1SA.17.10',
  initial: 'presenting',
  start: { trust: 0, fear: 0, resolve: 1 },
  nodes: [
    {
      id: 'presenting',
      /* He attacks nobody, and he does not wait either: the Philistine came on
         and drew near, morning and evening, for forty days. Holding still made
         the ways entry written for him unreachable, and made the one thing he
         does - close the distance while you decide nothing - impossible to
         feel. The party still stops advancing; he is the one who moves. */
      directive: { move: 'toward-player', posture: 'taunting', hostile: true, suppressesParty: true },
      drift: { resolve: 0.02 },
      transitions: [
        {
          to: 'answered',
          when: (c) => c.world.distanceToPlayer < 8,
          because: '1SA.17.32',
          note: 'ton serviteur ira, et se battra',
        },
      ],
    },
    {
      id: 'answered',
      // the suppression breaks the instant one person steps forward alone
      directive: { move: 'toward-player', posture: 'advancing', hostile: true },
      transitions: [
        {
          to: 'fallen',
          when: (c) => c.disposition.fear > 0.5,
          because: '1SA.17.49',
          note: 'il tomba le visage contre terre',
        },
      ],
    },
    {
      id: 'fallen',
      directive: { move: 'hold', posture: 'fallen' },
      transitions: [],
    },
  ],
};

/** Delilah — probes for the weakness, learns from every lie. Judges 16. */
export const DELILAH: Arc = {
  id: 'delilah',
  label: 'Celle Qui Sonde',
  solves: 'Enemies that never learn. This one asks, is lied to, tests the lie, and asks again.',
  source: 'JDG.16.6',
  initial: 'asking',
  start: { trust: 0.6, fear: 0, resolve: 0.7 },
  nodes: [
    {
      id: 'asking',
      directive: { move: 'toward-player', posture: 'coaxing' },
      transitions: [
        {
          to: 'testing',
          when: (c) => c.world.requestsMade >= 1,
          because: 'JDG.16.9',
          note: 'elle eprouve ce qu il lui a dit',
        },
      ],
    },
    {
      id: 'testing',
      directive: { move: 'hold', posture: 'testing', subverting: true },
      transitions: [
        {
          // each lie costs the player nothing now and everything later
          to: 'asking',
          when: (c) => c.world.playerDeceived && c.world.requestsMade < 4,
          because: 'JDG.16.10',
          note: 'voici tu t es joue de moi, declare moi donc',
        },
        {
          to: 'knowing',
          when: (c) => !c.world.playerDeceived,
          because: 'JDG.16.17',
          note: 'il lui ouvrit tout son coeur',
        },
      ],
    },
    {
      id: 'knowing',
      directive: { move: 'away-from-player', posture: 'departing', subverting: true },
      transitions: [],
    },
  ],
};

/** Jezebel — kills through the law, never with her own hand. 1 Kings 21. */
export const JEZEBEL: Arc = {
  id: 'jezebel',
  label: 'Celle Qui Use De La Loi',
  solves: 'Villains you can fight. This one never touches you; it turns your own institutions against you.',
  source: '1KI.21.8',
  initial: 'observing',
  start: { trust: 0.2, fear: 0, resolve: 0.9 },
  nodes: [
    {
      id: 'observing',
      directive: { move: 'hold', posture: 'observing' },
      transitions: [
        {
          to: 'drafting',
          when: (c) => c.world.playerSucceeding,
          because: '1KI.21.7',
          note: 'est ce toi qui exerces la royaute, je te donnerai la vigne',
        },
      ],
    },
    {
      id: 'drafting',
      // she writes letters, seals them with the king's seal, and stays clean
      directive: { move: 'hold', posture: 'writing', subverting: true },
      transitions: [
        {
          to: 'accusing',
          when: (c) => c.world.timeInNode > 4,
          because: '1KI.21.10',
          note: 'mettez deux faux temoins en face de lui',
        },
      ],
    },
    {
      id: 'accusing',
      directive: { move: 'hold', posture: 'accusing', subverting: true, effectOnPlayer: 'harm' },
      transitions: [
        {
          to: 'confronted',
          when: (c) => c.world.distanceToPlayer < 3 && !c.world.observedByOthers,
          because: '1KI.21.19',
          note: 'as tu tue, et encore pris possession',
        },
      ],
    },
    {
      id: 'confronted',
      directive: { move: 'hold', posture: 'unmasked' },
      transitions: [],
    },
  ],
};

/** Absalom — steals your allies at the gate by being more available than you. 2 Samuel 15. */
export const ABSALOM: Arc = {
  id: 'absalom',
  label: 'Celui Qui Derobe Les Coeurs',
  solves: 'Rivals that duel you. This one takes your allies one by one, by listening to them when you did not.',
  source: '2SA.15.6',
  initial: 'waiting-at-the-gate',
  start: { trust: 0.5, fear: 0, resolve: 0.8 },
  nodes: [
    {
      id: 'waiting-at-the-gate',
      // he intercepts petitioners before they ever reach the player
      directive: { move: 'hold', posture: 'greeting', subverting: true },
      transitions: [
        {
          to: 'flattering',
          when: (c) => c.world.distanceToPlayer > 15,
          because: '2SA.15.3',
          note: 'personne de la part du roi ne t ecoutera',
        },
      ],
    },
    {
      id: 'flattering',
      directive: { move: 'hold', posture: 'embracing', subverting: true },
      drift: { resolve: 0.05 },
      transitions: [
        {
          to: 'declaring',
          when: (c) => c.disposition.resolve > 0.95,
          because: '2SA.15.10',
          note: 'absalom regne a hebron',
        },
        {
          // presence alone stops it: he only works where the player is absent
          to: 'waiting-at-the-gate',
          when: (c) => c.world.distanceToPlayer < 8,
          because: '2SA.15.6',
          note: 'il se retient quand le roi parait',
        },
      ],
    },
    {
      id: 'declaring',
      directive: { move: 'hold', posture: 'crowned', hostile: true, subverting: true },
      transitions: [],
    },
  ],
};

/**
 * The tempter in the wilderness — quotes the text correctly, to a wrong end.
 * Matthew 4. The hardest adversary to write, and the only one the player cannot
 * out-fight: he is answered or he is not.
 */
export const TEMPTER: Arc = {
  id: 'tempter',
  label: 'Celui Qui Cite Juste',
  solves: 'Enemies defeated by damage. This one uses your own sources accurately, and only an answer stops him.',
  source: 'MAT.4.6',
  initial: 'approaching',
  start: { trust: 0.3, fear: 0, resolve: 1 },
  nodes: [
    {
      id: 'approaching',
      directive: { move: 'toward-player', posture: 'approaching' },
      transitions: [
        {
          to: 'proposing',
          when: (c) => c.world.distanceToPlayer < 5,
          because: 'MAT.4.3',
          note: 'si tu es le fils de dieu, ordonne que ces pierres deviennent des pains',
        },
      ],
    },
    {
      id: 'proposing',
      directive: { move: 'hold', posture: 'proposing', offering: true },
      transitions: [
        {
          // he does not misquote. The citation is exact and the use is wrong.
          to: 'citing',
          when: (c) => c.world.timeInNode > 3,
          because: 'MAT.4.6',
          note: 'car il est ecrit, il donnera des ordres a ses anges',
        },
      ],
    },
    {
      id: 'citing',
      directive: { move: 'hold', posture: 'citing', offering: true, subverting: true },
      transitions: [
        {
          to: 'departing',
          when: (c) => c.world.requestsMade >= 3,
          because: 'MAT.4.11',
          note: 'alors le diable le laissa',
        },
        {
          to: 'prevailing',
          when: (c) => c.world.timeInNode > 12,
          because: 'MAT.4.9',
          note: 'je te donnerai tout cela si tu te prosternes',
        },
      ],
    },
    {
      id: 'departing',
      directive: { move: 'away-from-player', posture: 'leaving' },
      transitions: [],
    },
    {
      id: 'prevailing',
      directive: { move: 'hold', posture: 'enthroned', hostile: true, subverting: true },
      transitions: [],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Four more of the ordinary sort                                      */
/* ------------------------------------------------------------------ */

/** Zacchaeus — solves occlusion by seeking height instead of pushing. Luke 19. */
export const ZACCHAEUS: Arc = {
  id: 'zacchaeus',
  label: 'Celui Qui Monte Pour Voir',
  solves: 'NPCs that shove through a crowd or clip through it. This one climbs.',
  source: 'LUK.19.4',
  initial: 'blocked',
  start: { trust: 0.5, fear: 0.2, resolve: 0.8 },
  nodes: [
    {
      id: 'blocked',
      directive: { move: 'toward-player', posture: 'craning' },
      transitions: [
        {
          to: 'climbing',
          when: (c) => c.world.pathBlocked,
          because: 'LUK.19.4',
          note: 'il monta sur un sycomore pour le voir',
        },
      ],
    },
    {
      id: 'climbing',
      directive: { move: 'hold', posture: 'perched' },
      transitions: [
        {
          to: 'called',
          when: (c) => c.world.distanceToPlayer < 5,
          because: 'LUK.19.5',
          note: 'hate toi de descendre',
        },
        {
          to: 'blocked',
          when: (c) => !c.world.pathBlocked,
          because: 'LUK.19.4',
          note: 'la voie se degage, il redescend',
        },
      ],
    },
    {
      id: 'called',
      directive: { move: 'toward-player', posture: 'hurrying', companion: true },
      transitions: [],
    },
  ],
};

/** The centurion — acts on your word without needing you present. Matthew 8. */
export const CENTURION: Arc = {
  id: 'centurion',
  label: "Celui Qui Comprend L Autorite",
  solves: 'Followers that must be escorted everywhere. This one executes an order you gave from far away.',
  source: 'MAT.8.8',
  initial: 'petitioning',
  start: { trust: 0.7, fear: 0.1, resolve: 0.9 },
  nodes: [
    {
      id: 'petitioning',
      directive: { move: 'toward-player', posture: 'petitioning' },
      transitions: [
        {
          to: 'trusting',
          when: (c) => c.world.errand !== null,
          because: 'MAT.8.8',
          note: 'dis seulement un mot',
        },
      ],
    },
    {
      id: 'trusting',
      // distance stops mattering: he goes and does it alone
      directive: { move: 'toward-errand', posture: 'executing' },
      transitions: [
        {
          to: 'done',
          when: (c) => c.world.timeInNode > 5,
          because: 'MAT.8.13',
          note: 'qu il te soit fait selon ta foi',
        },
      ],
    },
    {
      id: 'done',
      directive: { move: 'hold', posture: 'reporting' },
      transitions: [],
    },
  ],
};

/** Nicodemus — will only speak when nobody is watching. John 3. */
export const NICODEMUS: Arc = {
  id: 'nicodemus',
  label: 'Celui Qui Vient De Nuit',
  solves: 'NPCs with the same dialogue whoever is standing around. This one goes silent in company.',
  source: 'JHN.3.2',
  initial: 'distant',
  start: { trust: 0.5, fear: 0.5, resolve: 0.5 },
  nodes: [
    {
      id: 'distant',
      directive: { move: 'hold', posture: 'aloof' },
      transitions: [
        {
          to: 'approaching-unseen',
          when: (c) => !c.world.observedByOthers,
          because: 'JHN.3.2',
          note: 'il vint de nuit aupres de lui',
        },
      ],
    },
    {
      id: 'approaching-unseen',
      directive: { move: 'toward-player', posture: 'furtive' },
      transitions: [
        {
          to: 'speaking-freely',
          when: (c) => c.world.distanceToPlayer < 3 && !c.world.observedByOthers,
          because: 'JHN.3.2',
          note: 'nous savons que tu es venu de la part de dieu',
        },
        {
          to: 'distant',
          when: (c) => c.world.observedByOthers,
          because: 'JHN.3.2',
          note: 'on regarde, il se retire',
        },
      ],
    },
    {
      id: 'speaking-freely',
      directive: { move: 'hold', posture: 'confiding' },
      transitions: [
        {
          to: 'distant',
          when: (c) => c.world.observedByOthers,
          because: 'JHN.3.2',
          note: 'quelqu un vient, il se tait',
        },
        {
          // eventually he takes his side in the open, at real cost
          to: 'open',
          when: (c) => c.disposition.trust > 0.8,
          because: 'JHN.19.39',
          note: 'nicodeme vint aussi, en plein jour',
        },
      ],
    },
    {
      id: 'open',
      directive: { move: 'toward-player', posture: 'declared', companion: true },
      transitions: [],
    },
  ],
};

/** Achan — the party member who takes from the shared spoil. Joshua 7. */
export const ACHAN: Arc = {
  id: 'achan',
  label: 'Celui Qui Prend Dans Le Butin',
  solves: 'Party members that never betray the group. This one steals from the shared pool and the whole party pays.',
  source: 'JOS.7.21',
  initial: 'marching',
  start: { trust: 0.7, fear: 0.2, resolve: 0.4 },
  nodes: [
    {
      id: 'marching',
      directive: { move: 'toward-player', posture: 'marching', companion: true },
      transitions: [
        {
          to: 'coveting',
          when: (c) => c.world.spoilUnguarded,
          because: 'JOS.7.21',
          note: 'j ai vu, j ai convoite',
        },
      ],
    },
    {
      id: 'coveting',
      directive: { move: 'hold', posture: 'lingering', companion: true },
      drift: { resolve: -0.1 },
      transitions: [
        {
          to: 'hiding',
          when: (c) => c.disposition.resolve < 0.2,
          because: 'JOS.7.21',
          note: 'cela est cache dans la terre au milieu de ma tente',
        },
        {
          to: 'marching',
          when: (c) => !c.world.spoilUnguarded,
          because: 'JOS.7.21',
          note: 'le butin est garde, il repart',
        },
      ],
    },
    {
      id: 'hiding',
      // the party keeps him, and keeps losing, and nobody knows why
      directive: { move: 'toward-player', posture: 'concealing', companion: true, effectOnPlayer: 'harm' },
      transitions: [
        {
          to: 'exposed',
          when: (c) => c.world.playerSucceeding === false && c.world.timeInNode > 8,
          because: 'JOS.7.20',
          note: 'c est vrai, j ai peche',
        },
      ],
    },
    {
      id: 'exposed',
      directive: { move: 'hold', posture: 'confessing' },
      transitions: [],
    },
  ],
};

export const ADVERSARY_ARCS: readonly Arc[] = [
  SERPENT,
  PHARAOH,
  SAUL,
  GOLIATH,
  DELILAH,
  JEZEBEL,
  ABSALOM,
  TEMPTER,
];

export const FURTHER_ARCS: readonly Arc[] = [ZACCHAEUS, CENTURION, NICODEMUS, ACHAN];
