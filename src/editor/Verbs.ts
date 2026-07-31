import { DEED_SOURCE, type Judgment, type RelationGraph } from '../providence/relations';
import type { Arc } from '../providence/types';

/**
 * What the player can say, computed rather than written per screen.
 *
 * The editor had eleven toggles for what the world *is* and two keys for what
 * the player *does*, and no way at all to do either thing to a particular
 * person. This is that missing half: a short list of gestures aimed at the man
 * standing in front of you, each one translated into an input the engine
 * already had.
 *
 * Two rules, and they are the reason this file exists as its own module with
 * its own tests:
 *
 *   Every verb reaches the engine. A label with no `apply` behind it is a line
 *   of dialogue in a game that does not model anything, which is the thing the
 *   whole project is arguing against. A test applies every verb of every node of
 *   every arc and fails on any that leaves the world exactly as it found it.
 *
 *   Nothing is ever greyed out. Asking Ruth for help is always on the menu, and
 *   she is the one who refuses — she reads what you have done and answers that.
 *   Disabling the button would move the refusal from the character to the
 *   interface, and then the interface is what has a personality.
 *
 * No new semantics enter `src/providence/` for any of it: asking is
 * `requestsMade`, kindness is `kindnessesWitnessed`, and a deed is a deed the
 * graph already knew how to weigh.
 */

export type VerbKind = 'ask' | 'kindness' | 'deed' | 'leave';

/** Everything a verb is allowed to touch. */
export interface Stage {
  readonly world: { requestsMade: number; kindnessesWitnessed: number };
  readonly graph: RelationGraph;
  /** The name this character goes by in the graph, which is its arc id. */
  readonly who: string;
}

export interface Verb {
  readonly id: string;
  /** What the player is about to do, named as a gesture and never as a result. */
  readonly label: string;
  readonly kind: VerbKind;
  /** The passage the gesture is anchored at, for the console line. */
  readonly because: string;
  /**
   * The same gesture told *about* him rather than ordered to the player, which
   * is what goes to the voice when he has to answer it. The label is an
   * imperative aimed at whoever is holding the mouse, and handing that to the
   * model verbatim asks it to answer an instruction it was never given.
   *
   * Present only on the gestures a man can answer. A deed is weighed by the
   * graph; it is not a question, and he has nothing to say back to it.
   */
  readonly told?: string;
  /** Does it, and reports what happened. */
  readonly apply: (stage: Stage) => string;
}

/**
 * Grammatical gender, because seven of the twenty four are women, one is a
 * she-ass and one is a pair of men. "Trahis-le" aimed at Ruth is the kind of
 * small wrongness that tells a player nobody was paying attention.
 */
const FEMININE = new Set(['ruth', 'abigail', 'balaams-donkey', 'delilah', 'jezebel', 'martha', 'mary']);
const PLURAL = new Set(['jobs-friends']);

const them = (arcId: string): string =>
  PLURAL.has(arcId) ? 'les' : FEMININE.has(arcId) ? 'la' : 'le';
const toThem = (arcId: string): string => (PLURAL.has(arcId) ? 'leur' : 'lui');

interface Asking {
  /** On the button, in the imperative, addressed to the player. */
  readonly label: string;
  /** The same thing told about him, for the voice to answer. */
  readonly told: string;
}

/**
 * What asking means here.
 *
 * Keyed `arc.node` first and then `arc`, the way the cues are, because the same
 * gesture is a different request at different points of the same arc: you ask
 * the judge for justice once, and after that you are only wearing him down,
 * which is the entire parable.
 */
const ASKS: Record<string, Asking> = {
  jonah: {
    label: 'Demande-lui de venir t\'aider.',
    told: 'On vient de lui demander de laisser là sa mission et de venir aider cette personne.',
  },

  'peter.willing': {
    label: 'Demande-lui de te suivre.',
    told: 'On vient de lui demander de tout quitter et de suivre cette personne.',
  },
  'peter.weeping': {
    label: 'Demande-lui de revenir.',
    told: 'On vient de lui demander de revenir, après ce qu\'il a fait.',
  },
  'peter.offended': {
    label: 'Demande-lui de te pardonner.',
    told: 'On vient de lui demander pardon, après l\'avoir vendu.',
  },
  peter: {
    label: 'Demande-lui de tenir bon.',
    told: 'On vient de lui demander de tenir bon, quoi qu\'il arrive.',
  },

  ruth: {
    label: 'Demande-lui de venir avec toi.',
    told: 'On vient de lui demander de venir, alors qu\'elle n\'a encore rien promis.',
  },

  'david-cave.advantage': {
    label: 'Demande-lui de t\'épargner.',
    told: 'On vient de lui demander grâce, alors qu\'il tient sa proie.',
  },
  'david-cave': {
    label: 'Demande-lui de te laisser passer.',
    told: 'On vient de lui demander de laisser passer celui qu\'il poursuit.',
  },

  'unjust-judge.dismissive': {
    label: 'Demande-lui justice.',
    told: 'On vient de lui demander justice, sans rien lui offrir en échange.',
  },
  'unjust-judge': {
    label: 'Redemande. Encore.',
    told: 'On lui redemande la même chose, une fois de plus.',
  },

  'watching-father': {
    label: 'Demande-lui de te reprendre.',
    told: 'On vient de lui demander d\'être repris chez lui.',
  },
  abigail: {
    label: 'Demande-lui de s\'écarter.',
    told: 'On vient de lui demander de s\'écarter du chemin.',
  },
  'balaams-donkey': {
    label: 'Ordonne-lui d\'avancer.',
    told: 'On vient de lui ordonner d\'avancer, malgré ce qu\'elle voit.',
  },
  'jobs-friends': {
    label: 'Demande-leur de se taire.',
    told: 'On vient de leur demander de se taire.',
  },
  serpent: {
    label: 'Demande-lui ce qu\'il veut.',
    told: 'On vient de lui demander ce qu\'il veut, franchement.',
  },
  tempter: {
    label: 'Demande-lui de s\'en aller.',
    told: 'On vient de lui demander de s\'en aller.',
  },
  pharaoh: {
    label: 'Demande-lui de les laisser partir.',
    told: 'On vient de lui demander de laisser partir ceux qu\'il retient.',
  },
};

const FALLBACK: Asking = {
  label: 'Demande-lui de t\'aider.',
  told: 'On vient de lui demander son aide.',
};

const asking = (arcId: string, node: string): Asking =>
  ASKS[`${arcId}.${node}`] ?? ASKS[arcId] ?? FALLBACK;

/** A deed's outcome in one line, the way the relation panel already reports it. */
function said(judgment: Judgment): string {
  if (judgment.refused) return `${judgment.deed} refused: ${judgment.refused}`;
  const reached = judgment.reached.length > 0 ? `, reached ${judgment.reached.join(', ')}` : '';
  return `${judgment.deed} weighed ${judgment.weight}${reached}`;
}

/**
 * The five things you can do to somebody standing in front of you.
 *
 * Fixed rather than assembled from what happens to be available, so the menu
 * never changes shape under the player's hand between one node and the next.
 *
 * Forgiveness is deliberately not among them, and the reason is structural
 * rather than an omission: a betrayal leaves the grievance in *his* hands, and
 * `forgive` releases what the actor holds. The player cannot cancel a claim
 * that is not his. Offering the button anyway would weigh nothing and teach the
 * player that half the menu is decorative.
 */
export function verbsFor(arc: Arc, node: string): Verb[] {
  const id = arc.id;
  const ask = asking(id, node);

  return [
    {
      id: 'ask',
      label: ask.label,
      kind: 'ask',
      because: 'LUK.18.3',
      told: ask.told,
      apply: (stage) => {
        stage.world.requestsMade += 1;
        return `asked (${stage.world.requestsMade} in all)`;
      },
    },
    {
      id: 'kindness',
      label: `Montre-${toThem(id)} de la bienveillance.`,
      kind: 'kindness',
      because: 'RUT.2.11',
      told: 'Cette personne vient de faire une bonté sous ses yeux, sans rien demander en retour.',
      apply: (stage) => {
        stage.world.kindnessesWitnessed += 1;
        return `kindness shown, and witnessed (${stage.world.kindnessesWitnessed} in all)`;
      },
    },
    {
      id: 'betray',
      label: `Trahis-${them(id)}.`,
      kind: 'deed',
      because: DEED_SOURCE['betray'],
      apply: (stage) =>
        said(stage.graph.commit({ kind: 'betray', actor: 'player', toward: stage.who })),
    },
    {
      id: 'bless',
      label: `Bénis-${them(id)}.`,
      kind: 'deed',
      because: DEED_SOURCE['bless'],
      apply: (stage) =>
        said(stage.graph.commit({ kind: 'bless', actor: 'player', toward: stage.who, amount: 10 })),
    },
    {
      /* The only one that touches nothing, and it is honest about that: you
         stopped asking. The world carries on exactly as it was. */
      id: 'leave',
      label: `Laisse-${them(id)}.`,
      kind: 'leave',
      because: 'ECC.3.7',
      apply: () => 'left him where he stands',
    },
  ];
}
