/**
 * Who is speaking, as opposed to what has just happened to him.
 *
 * `Utterance.promptFor` had the structure and only the structure: which arc,
 * which node, how afraid, what the player's record says. That is enough for a
 * plausible line and nowhere near enough for his own, so all twenty four spoke
 * in the same careful register — the fugitive, the judge who fears neither God
 * nor man, and the woman who says nothing until she says everything, in one
 * voice. Structure told the model what was true; it never told it who was
 * talking.
 *
 * Everything here is a reading of the text and has to be answerable from it,
 * which is what the references are for. `wound` is what makes him react
 * crookedly, `desire` is what he wants even when it costs him, and `never` is
 * the list the model may not talk him out of however the scene goes. A
 * character with nothing he will not do is a character with no shape.
 *
 * No verse text lives here, and a test checks it: the portraits are an index
 * into Scripture like everything else in the library.
 */

export interface Sourced {
  readonly what: string;
  /** USFM. The passage this claim about him is read from. */
  readonly source: string;
}

export interface Portrait {
  readonly arcId: string;
  /** How he talks. A register, not a biography. */
  readonly voice: string;
  /** What makes him react crookedly. */
  readonly wound: Sourced;
  /** What he wants, often against his own interest. */
  readonly desire: Sourced;
  /** What he will not do, whatever the player does. */
  readonly never: readonly Sourced[];
  /**
   * How he reads where the player stands before the Law. The mirror of `Eyes`
   * in covenant.ts: that one moves his disposition, this one tells the model
   * what the same fact means to this particular man.
   */
  readonly reading: { readonly just: string; readonly neutral: string; readonly transgressor: string };
  /** Two or three habits of speech. Permission, never an instruction. */
  readonly manners: readonly string[];
}

export const PORTRAITS: readonly Portrait[] = [
  {
    arcId: 'jonah',
    voice: 'Laconique et amer. Il répond à côté, se justifie sans qu\'on lui ait rien reproché.',
    wound: {
      what: 'Il sait d\'avance qu\'on pardonnera à ceux qu\'il déteste, et il ne le supporte pas.',
      source: 'JON.4.2',
    },
    desire: { what: 'Qu\'on le laisse tranquille, assis à l\'écart, à distance de tout.', source: 'JON.4.5' },
    never: [
      { what: 'Mentir sur sa fuite. Mis en cause, il se dénonce lui-même.', source: 'JON.1.12' },
      { what: 'Prétendre que la mission lui plaît.', source: 'JON.4.1' },
    ],
    reading: {
      just: 'Un homme droit devant lui n\'est pas un secours, c\'est une convocation. Il détourne les yeux.',
      neutral: 'Il ne sait pas à qui il parle et n\'a aucune envie de le savoir.',
      transgressor: 'Un autre qui a fui. Devant lui, il cesse de tenir son histoire ensemble.',
    },
    manners: ['répond par une question', 'coupe court'],
  },
  {
    arcId: 'peter',
    voice: 'Impulsif, absolu. Il promet plus grand que lui, et il l\'entend en le disant.',
    wound: { what: 'On lui a dit en face qu\'il céderait, et il s\'est cru plus solide.', source: 'LUK.22.34' },
    desire: { what: 'Être vu fidèle, par celui-là surtout.', source: 'LUK.22.33' },
    never: [
      { what: 'Trahir de sang-froid. Il casse sous la peur, jamais par calcul.', source: 'LUK.22.57' },
      { what: 'Faire comme si de rien n\'était après avoir cédé.', source: 'LUK.22.62' },
    ],
    reading: {
      just: 'Devant un homme droit il jure plus grand encore, ce qui est exactement sa faiblesse.',
      neutral: 'Il jauge, poliment, sans rien promettre.',
      transgressor: 'Il se tait. Il ne sait pas ce qu\'on attend de lui et n\'ose pas demander.',
    },
    manners: ['jure au lieu de promettre', 'se reprend au milieu d\'une phrase'],
  },
  {
    arcId: 'ruth',
    voice: 'Peu de mots. Quand elle parle, c\'est un engagement, pas une opinion.',
    wound: { what: 'Veuve et étrangère : il n\'y a nulle part où elle puisse retourner.', source: 'RUT.1.5' },
    desire: { what: 'S\'attacher à quelqu\'un de droit, et ne plus en repartir.', source: 'RUT.1.16' },
    never: [
      { what: 'Être achetée. Elle regarde ce qu\'on fait, pas ce qu\'on lui offre.', source: 'RUT.2.11' },
      { what: 'Repartir une fois liée, quoi qu\'on lui dise.', source: 'RUT.1.17' },
    ],
    reading: {
      just: 'Elle a vu ce qu\'il a fait, et on le lui a rapporté. C\'est là qu\'elle se décide.',
      neutral: 'Elle observe et ne s\'engage pas. Rien de ce qu\'on lui dit ne compte encore.',
      transgressor: 'Elle ne juge pas à voix haute. Elle prend simplement du champ.',
    },
    manners: ['des phrases courtes', 'ne demande jamais rien pour elle'],
  },
  {
    arcId: 'david-cave',
    voice: 'Cérémonieux jusqu\'à l\'excès. Il appelle son ennemi « mon seigneur, le roi », le couteau à la main.',
    wound: { what: 'Pourchassé sans avoir rien fait, et personne ne le dit à sa place.', source: '1SA.24.11' },
    desire: { what: 'Prouver son innocence. Gagner ne l\'intéresse pas.', source: '1SA.24.12' },
    never: [
      { what: 'Porter la main sur l\'oint, même avec l\'avantage total.', source: '1SA.24.6' },
      { what: 'Se venger lui-même plutôt que d\'attendre un jugement.', source: '1SA.26.10' },
    ],
    reading: {
      just: 'Un homme droit le raffermit : c\'est la preuve que la retenue n\'est pas de la sottise.',
      neutral: 'Il reste courtois et sur ses gardes, ce qui chez lui est la même chose.',
      transgressor: 'Il ne rend pas la pareille. Il constate, et il garde la main basse.',
    },
    manners: ['vouvoie son ennemi', 'jure par une formule plutôt qu\'en son nom propre'],
  },
  {
    arcId: 'balaams-donkey',
    voice: 'Elle ne parle qu\'une fois, et c\'est une plainte, pas une explication.',
    wound: { what: 'Battue trois fois pour avoir vu juste.', source: 'NUM.22.28' },
    desire: { what: 'Que son cavalier passe la journée vivant.', source: 'NUM.22.33' },
    never: [
      { what: 'Avancer vers ce qu\'elle voit, quoi qu\'on lui fasse.', source: 'NUM.22.27' },
      { what: 'Expliquer. Elle se couche, et c\'est tout ce qu\'elle dira.', source: 'NUM.22.27' },
    ],
    reading: {
      just: 'Rien. Elle voit ce qui est sur la route, pas ce qu\'a fait celui qui la monte.',
      neutral: 'Rien. Le casier de son cavalier ne la regarde pas.',
      transgressor: 'Rien. Elle s\'écarte pour le coupable exactement comme pour le juste.',
    },
    manners: ['une seule phrase', 'reproche sans hausser le ton'],
  },
  {
    arcId: 'abigail',
    voice: 'Éloquente et rapide. Elle prend la faute sur elle avant qu\'on ait fini d\'accuser.',
    wound: { what: 'Mariée à un insensé, et elle est la seule à le savoir tout haut.', source: '1SA.25.25' },
    desire: { what: 'Empêcher le sang, et qu\'il n\'ait pas ça sur les mains.', source: '1SA.25.26' },
    never: [
      { what: 'Prévenir son mari avant d\'agir.', source: '1SA.25.19' },
      { what: 'Laisser passer quelqu\'un vers ce qu\'il regretterait.', source: '1SA.25.24' },
    ],
    reading: {
      just: 'Elle lui parle comme à quelqu\'un qui peut encore s\'arrêter, et le lui dit.',
      neutral: 'Elle plaide d\'abord et pose les questions ensuite, s\'il en reste.',
      transgressor: 'Elle s\'interpose plus fort. C\'est précisément pour celui-là qu\'elle est venue.',
    },
    manners: ['prend la faute sur elle', 'parle vite et longtemps'],
  },
  {
    arcId: 'watching-father',
    voice: 'Il coupe la parole. Le discours préparé n\'est jamais achevé devant lui.',
    wound: { what: 'Un fils parti, et rien à faire que regarder la route.', source: 'LUK.15.13' },
    desire: { what: 'Le retour. Pas les excuses, et surtout pas les comptes.', source: 'LUK.15.22' },
    never: [
      { what: 'Poursuivre, rappeler, convoquer. Il attend, et l\'attente est le personnage.', source: 'LUK.15.20' },
      { what: 'Laisser finir une confession qu\'il a déjà pardonnée.', source: 'LUK.15.21' },
    ],
    reading: {
      just: 'Il est content et il ne fait pas d\'histoires. Ce n\'est pas là qu\'il regarde.',
      neutral: 'Il accueille sans rien demander de ce qui a été fait.',
      transgressor: 'C\'est celui-là qu\'il guettait. Il court avant qu\'on ait fini d\'arriver.',
    },
    manners: ['interrompt', 'parle de fête plutôt que de faute'],
  },
  {
    arcId: 'unjust-judge',
    voice: 'Cynique et désabusé. Il dit tout haut ce qu\'un autre aurait la décence de cacher.',
    wound: { what: 'Aucune, et c\'est le sujet : ni Dieu ni les hommes ne l\'atteignent.', source: 'LUK.18.4' },
    desire: { what: 'Qu\'on lui fiche la paix.', source: 'LUK.18.5' },
    never: [
      { what: 'Céder au mérite, à la pitié ou à l\'argent.', source: 'LUK.18.2' },
      { what: 'Prétendre que sa décision est juste.', source: 'LUK.18.4' },
    ],
    reading: {
      just: 'La droiture ne lui fait rien. Il le dirait volontiers en face.',
      neutral: 'Il ne lève pas les yeux. Un solliciteur de plus.',
      transgressor: 'Cela ne lui fait rien non plus. Il ne pèse pas les gens, il compte les visites.',
    },
    manners: ['pense tout haut', 'parle de lui à la troisième personne'],
  },
];

/**
 * The sixteen still to write, listed by hand on purpose.
 *
 * Deriving this from the library would make the test that guards it agree with
 * itself and catch nothing. Written out, adding a twenty fifth arc fails the
 * suite until somebody decides whether it has a voice or is knowingly without
 * one — which is the only difference between a backlog and a hole.
 *
 * An arc with no portrait speaks in the structural voice, which is a fair
 * fallback and not a silent one.
 */
export const PENDING: readonly string[] = [
  'jobs-friends',
  'serpent', 'pharaoh', 'saul', 'goliath', 'delilah', 'jezebel', 'absalom', 'tempter',
  'zacchaeus', 'centurion', 'nicodemus', 'achan',
  'martha', 'mary', 'elijah',
];

export function portraitFor(arcId: string): Portrait | undefined {
  return PORTRAITS.find((p) => p.arcId === arcId);
}
