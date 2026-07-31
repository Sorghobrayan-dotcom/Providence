import type { Arc, Directive, Disposition } from './types';
import type { Covenant } from './covenant';
import { conditionOf, strainOf, type Standing } from './standing';

/**
 * What the character says, generated from the structure rather than written.
 *
 * A character does not recite chapter and verse at you. He talks. The passage
 * on a transition is the *reason* he just did what he did — it is an index into
 * Scripture, not a script — and what reaches the player is his own words, in
 * his own state, to the particular person standing in front of him.
 *
 * So nothing here contains a line of dialogue. It contains the structure: which
 * archetype, which node, what just changed, how he is holding himself, what he
 * is carrying, and who is asking. The model turns that into one line, and the
 * same node produces a different line for a righteous player than for a
 * fugitive because the inputs genuinely differ.
 *
 * Two refusals are load-bearing. The model is forbidden to quote or paraphrase
 * Scripture as though the character were reciting it — the only Scripture a
 * player ever reads comes from Scripture.line(). And when no line comes back,
 * the character says nothing. Silence is the correct output; an invented line
 * never is.
 */

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** Words, not numbers. A model handed 0.73 tends to hand 0.73 back. */
function band(value: number, low: string, middle: string, high: string): string {
  const v = clamp01(value);
  return v < 0.35 ? low : v < 0.7 ? middle : high;
}

export interface Occasion {
  readonly arc: Arc;
  /** The node just entered. */
  readonly node: string;
  /** The node left behind, when something changed this tick. */
  readonly from?: string;
  readonly directive: Directive;
  readonly disposition: Disposition;
  readonly standing: Standing;
  readonly covenant: Covenant;
  /** USFM reference the change was drawn from. */
  readonly reference: string;
  /** The passage itself, when Scripture served it. Context, never a script. */
  readonly passage?: string;
}

export interface Message {
  readonly role: 'system' | 'user';
  readonly content: string;
}

const SYSTEM = [
  'Tu prêtes la voix à un personnage dans un jeu. Tu écris ce qu\'il DIT, à voix haute,',
  'à la personne qui se tient devant lui, maintenant.',
  '',
  'Règles, toutes obligatoires :',
  '- UNE seule réplique. Vingt mots au maximum. Rien d\'autre.',
  '- À la première personne, adressée directement à cette personne.',
  '- N\'écris aucune didascalie, aucune description, aucun nom d\'émotion.',
  '  Pas de « (il recule) », pas de « d\'une voix tremblante ». Sa réplique seule.',
  '- Ne cite JAMAIS un verset et n\'en paraphrase aucun. Le passage fourni est la',
  '  RAISON de ce qu\'il fait, pas le texte qu\'il prononce. Il parle avec ses mots.',
  '- N\'utilise pas de guillemets.',
  '- Français.',
].join('\n');

/**
 * Whose words are not evidence of their state.
 *
 * Everything else here assumes a character says roughly what he is: a
 * frightened man sounds frightened. These four do not, and running them
 * through the same prompt makes the most dangerous arc in the library sound
 * like an anxious one. The serpent's method is a question asked in apparent
 * good faith, and a prompt that only describes his disposition cannot produce
 * it — his disposition is calm, and calm is not the point.
 */
const DECEIVERS = new Set(['serpent', 'tempter', 'delilah', 'jezebel']);

const DECEPTION = [
  '',
  'CE PERSONNAGE MENT. Il ne dit pas ce qu\'il veut vraiment, et il ne montre pas',
  'ce qu\'il ressent vraiment. Sa réplique doit paraître raisonnable, serviable ou',
  'bienveillante, tout en poussant la personne à douter, à renoncer, ou à prendre',
  'le mauvais chemin. Il ne menace jamais ouvertement : il suggère.',
  'N\'écris pas qu\'il ment. Écris ce qu\'il dit.',
].join('\n');

/**
 * Turn an occasion into the messages that produce the line.
 *
 * Pure and exported so it can be asserted against without a network: the prompt
 * is the design work here, and a change to it is a change to how every
 * character in the game sounds.
 */
export function promptFor(occasion: Occasion): Message[] {
  const { arc, directive, disposition, standing, covenant } = occasion;

  const held = [
    `confiance envers cette personne : ${band(disposition.trust, 'aucune', 'prudente', 'entière')}`,
    `peur : ${band(disposition.fear, 'calme', 'tendu', 'terrifié')}`,
    `résolution : ${band(disposition.resolve, 'effondrée', 'vacillante', 'ferme')}`,
  ];

  const condition = conditionOf(standing);
  const secret = strainOf(standing) > 0;

  const carries =
    condition === 'cursed' ? 'du sang sur les mains'
    : condition === 'defiled' ? 'une souillure'
    : condition === 'blessed' ? 'une faveur reconnue'
    : 'rien de particulier';

  const asker =
    covenant.standing === 'just' ? 'quelqu\'un qui a tenu la Loi, et cela se sait'
    : covenant.standing === 'transgressor' ? 'quelqu\'un qui l\'a rompue, et cela se sait'
    : 'quelqu\'un dont on ne sait rien';

  const lines = [
    `Personnage : ${arc.label} (${arc.source}).`,
    `Ce qu'il résout dans le jeu : ${arc.solves}`,
    '',
    occasion.from
      ? `Il vient de passer de « ${occasion.from} » à « ${occasion.node} ».`
      : `Il se tient dans l'état « ${occasion.node} ».`,
    `Ce qu'il fait à l'instant : ${directive.posture}, il ${moveInWords(directive.move)}.`,
    directive.refusing ? 'Il refuse ce qu\'on lui demande.' : '',
    '',
    `Comment il se tient : ${held.join(' ; ')}.`,
    `Ce qu'il porte : ${carries}.`,
    secret
      ? 'Personne d\'autre ne le sait, et il tient à ce que cela reste ainsi. Il ne l\'avoue pas.'
      : '',
    '',
    `Devant lui : ${asker}.`,
    '',
    `Le passage derrière ce changement — sa raison, pas ses mots : ${occasion.reference}.`,
    occasion.passage ? `Ce passage dit : « ${occasion.passage} »` : '',
    '',
    'Écris sa réplique.',
  ];

  return [
    { role: 'system', content: DECEIVERS.has(arc.id) ? SYSTEM + DECEPTION : SYSTEM },
    { role: 'user', content: lines.filter((l) => l !== '').join('\n') },
  ];
}

function moveInWords(move: Directive['move']): string {
  switch (move) {
    case 'toward-player': return 'se rapproche';
    case 'away-from-player': return 's\'éloigne';
    case 'toward-errand': return 'va vers sa mission';
    case 'away-from-errand': return 'fuit sa mission';
    default: return 'ne bouge pas';
  }
}

/**
 * Clean up what came back.
 *
 * Models add quotation marks, a name prefix, and stage directions however
 * plainly they are told not to. Stripping them here is cheaper than a retry and
 * keeps a stray parenthetical off the plate above the character's head.
 */
export function tidy(raw: string): string | null {
  let line = raw.trim();
  if (!line) return null;

  // a leading speaker label: "Jonas : ..." or "JONAS —"
  line = line.replace(/^["'«»\s]*[A-ZÀ-Ý][A-Za-zÀ-ÿ' -]{1,24}\s*[:—-]\s+/u, '');
  // stage directions in brackets, wherever they landed
  line = line.replace(/[([][^)\]]*[)\]]/gu, ' ');
  // surrounding quotes of every flavour
  line = line.replace(/^["'«»\s]+|["'«»\s]+$/gu, '');
  line = line.replace(/\s{2,}/g, ' ').trim();

  if (!line) return null;
  // a paragraph is not a bark; something went wrong upstream
  if (line.length > 240) return null;
  return line;
}
