import type { RelationGraph } from './relations';
import type { Disposition } from './types';

/**
 * Where the player stands before the Law.
 *
 * This is the axis the engine was missing. Trust, fear and resolve are
 * psychology: how a character feels. Standing is not psychology and not an
 * opinion — it is the public record of what the player has done, the same for
 * everyone who looks at it. A patriarch who commits a secret blood crime has
 * barely changed his mood and has entirely changed his standing.
 *
 * It is deliberately not part of Memory. Memory is one character's private view
 * of someone — what they did to *me*. Standing is what they did at all, and two
 * characters who have never met the player read the identical record.
 *
 * Nothing here decides behaviour. It publishes a fact; each archetype reads that
 * fact through its own eyes, which is what `Eyes` below is for, and that reading
 * is where the same righteousness comes out as welcome on one face and as dread
 * on another.
 */

export type Standing = 'just' | 'neutral' | 'transgressor';

export interface Covenant {
  /** −1 (blood on the hands) to +1 (the Law kept). */
  readonly score: number;
  readonly standing: Standing;
  /**
   * Grave deeds that do not average out. A hundred blessings do not settle
   * blood: the ground itself is said to hold the claim, so this is counted
   * separately from the score rather than folded into it.
   */
  readonly bloodGuilt: number;
  /** How many of the player's deeds reached third parties, not just one person. */
  readonly witnessed: number;
  /** The passage this standing is read from. Resolved through YouVersion. */
  readonly because: string;
}

/**
 * What each deed is worth against the Law, and where that is written.
 *
 * These are not gameplay tuning numbers pulled from nowhere. Forgiveness costs
 * more than a blessing because it is the harder thing; blood outweighs every
 * other transgression by more than double for the same reason. Each one already
 * has its passage in DEED_SOURCE, so this table is a weighting of an index into
 * Scripture, not a morality meter invented on top of one.
 */
const WORTH: Record<string, number> = {
  forgive: 1.2,
  bless: 1,
  redeem: 1,
  lend: 0.6,
  'sell-birthright': -0.5,
  'steal-blessing': -1.2,
  betray: -1.4,
  'shed-blood': -2.5,
};

/** Above this the player is keeping the Law; below the lower bound, breaking it. */
const JUST_ABOVE = 0.35;
const TRANSGRESSOR_BELOW = -0.2;

export const NO_COVENANT: Covenant = {
  score: 0,
  standing: 'neutral',
  bloodGuilt: 0,
  witnessed: 0,
  // 'there is none that doeth good' — the standing of someone with no record yet
  because: 'PSA.14.3',
};

export function covenantOf(graph: RelationGraph, who = 'player'): Covenant {
  /* A refused deed did not happen. The engine records the attempt and the
     passage it was blocked under, and standing must not charge someone for
     something the world would not let them do. */
  const deeds = graph.ledger.filter((j) => j.actor === who && !j.refused);
  if (deeds.length === 0) return NO_COVENANT;

  let credit = 0;
  let total = 0;
  let bloodGuilt = 0;
  let witnessed = 0;

  for (const j of deeds) {
    const worth = WORTH[j.deed] ?? 0;
    credit += worth;
    total += Math.abs(worth);
    if (j.deed === 'shed-blood') bloodGuilt += 1;
    if (j.reached.length > 0) witnessed += 1;
  }

  const score = total === 0 ? 0 : Math.max(-1, Math.min(1, credit / total));

  /* Blood is not averaged. This is the one place standing refuses to be a
     running total, and it is the difference between a covenant and a score bar:
     no quantity of later good moves someone out of it. */
  const standing: Standing =
    bloodGuilt > 0 ? 'transgressor'
    : score > JUST_ABOVE ? 'just'
    : score < TRANSGRESSOR_BELOW ? 'transgressor'
    : 'neutral';

  const because =
    bloodGuilt > 0 ? 'GEN.4.10'
    : standing === 'just' ? 'PSA.15.2'
    : standing === 'transgressor' ? 'PRO.28.13'
    : 'PSA.14.3';

  return { score, standing, bloodGuilt, witnessed, because };
}

/**
 * How one archetype reads a standing.
 *
 * The pressure is applied per second, the way `drift` is, so a standing works
 * on a character over time instead of snapping it into a new mood on the frame
 * the player walks in.
 */
export interface Reading {
  readonly pressure: Partial<Disposition>;
  readonly because: string;
}

export type Eyes = (covenant: Covenant) => Reading;

export const INDIFFERENT: Reading = { pressure: {}, because: 'PSA.14.3' };

/**
 * The guilty fugitive. Jonah.
 *
 * This is the inversion the whole axis exists for. A righteous person walking up
 * is not a comfort to him, it is a summons: he ran precisely because he knew
 * what the just would ask of him, which is what he says outright in Jonah 4:2.
 * So piety in front of him raises fear and lowers trust — the opposite sign to
 * every well-adjusted character in the library.
 *
 * A transgressor is the reverse. Not a threat: company. Someone else who has
 * also run, in front of whom he does not have to hold the story together.
 */
export const FUGITIVE_EYES: Eyes = (c) => {
  if (c.standing === 'just') {
    return {
      // 'I fled before, for I knew that thou art a gracious God'
      pressure: { fear: 0.09, trust: -0.05, resolve: -0.04 },
      because: 'JON.4.2',
    };
  }
  if (c.standing === 'transgressor') {
    return {
      // he stops performing and says what is actually wrong with him
      pressure: { fear: -0.06, trust: 0.07 },
      because: 'JON.1.12',
    };
  }
  return INDIFFERENT;
};

/**
 * The one who stays. Ruth.
 *
 * The same record, read the other way up: righteousness is where she wants to
 * be, so it opens her. But the important half is what a transgressor does to
 * her, which is almost nothing. Her trust dips and her resolve does not move,
 * because a devotion that only holds for the deserving is not the thing Ruth 1:16
 * describes. An archetype is defined as much by what fails to move it.
 */
export const DEVOTED_EYES: Eyes = (c) => {
  if (c.standing === 'just') {
    return { pressure: { trust: 0.08, resolve: 0.05, fear: -0.04 }, because: 'RUT.2.12' };
  }
  if (c.standing === 'transgressor') {
    return { pressure: { trust: -0.04 }, because: 'RUT.1.16' };
  }
  return INDIFFERENT;
};

/**
 * Build a reading from the two cases that matter. Neutral is always nothing:
 * a player with no record has given nobody anything to react to.
 */
const eyes = (
  just: [Partial<Disposition>, string],
  transgressor: [Partial<Disposition>, string],
): Eyes => (c) =>
  c.standing === 'just' ? { pressure: just[0], because: just[1] }
  : c.standing === 'transgressor' ? { pressure: transgressor[0], because: transgressor[1] }
  : INDIFFERENT;

/**
 * Deliberately indifferent. Not the same thing as being left out of the table:
 * these arcs were considered and the answer is that standing must not move
 * them, which is a claim about the character and belongs in the code.
 */
const BLIND: Eyes = () => INDIFFERENT;

/**
 * Every archetype's reading, by arc id.
 *
 * Read down the 'just' column and note how often it is the adversaries whose
 * resolve *rises*. That is the point of the whole table: righteousness is not a
 * universal calming influence, it is a provocation to anything that lives off
 * it. A tempter has nothing to work with in someone who reveres nothing.
 */
export const EYES: Record<string, Eyes> = {
  jonah: FUGITIVE_EYES,
  ruth: DEVOTED_EYES,

  /* ── Adversaries ─────────────────────────────────────────────────────────
     Almost all of them sharpen on a righteous player, because almost all of
     them are parasitic on something only a righteous player has. */

  // he works on the ones still keeping it. 'Hath God said?' needs a listener
  // who thought God had said something.
  serpent: eyes([{ resolve: 0.07, trust: 0.05 }, 'GEN.3.1'],
                [{ resolve: -0.05 }, 'GEN.3.4']),

  // respite is what hardens him; a righteous petitioner is a pressure he can
  // out-wait, and he knows it
  pharaoh: eyes([{ resolve: 0.06, trust: -0.05 }, 'EXO.8.15'],
                [{ fear: -0.04, trust: 0.04 }, 'EXO.5.2']),

  // 'Saul was afraid of David, because the LORD was with him.' The clearest
  // inversion in the library: merit itself is the threat.
  saul: eyes([{ fear: 0.08, trust: -0.09 }, '1SA.18.12'],
             [{ fear: -0.05, trust: 0.05 }, '1SA.18.9']),

  // he disdained him. A champion does not fear the righteous, he is insulted
  // by being sent one.
  goliath: eyes([{ resolve: 0.07, fear: -0.05 }, '1SA.17.42'],
                [{ resolve: -0.03 }, '1SA.17.44']),

  // she pressed him daily. Someone who will not lie to her is not a dead end,
  // it is a reason to keep asking.
  delilah: eyes([{ resolve: 0.08 }, 'JDG.16.16'],
                [{ trust: 0.06, resolve: -0.03 }, 'JDG.16.5']),

  // her method needs a reputation to destroy and a court to do it in. Neither
  // exists around someone already disgraced.
  jezebel: eyes([{ resolve: 0.08, trust: -0.04 }, '1KI.21.10'],
                [{ resolve: -0.06 }, '1KI.21.7']),

  // he steals hearts, so he needs someone whose allies are worth stealing
  absalom: eyes([{ resolve: 0.07, trust: 0.05 }, '2SA.15.6'],
                [{ resolve: -0.04 }, '2SA.15.4']),

  // he quotes accurately. The weapon only works on someone who holds the text
  // he is quoting, which is why he has nothing to say to a transgressor.
  tempter: eyes([{ resolve: 0.09, trust: 0.06 }, 'MAT.4.6'],
                [{ resolve: -0.07 }, 'MAT.4.11']),

  // he climbs precisely because he cannot walk up. Drawn and ashamed at once,
  // which is why both trust and fear rise on the same reading.
  zacchaeus: eyes([{ trust: 0.07, fear: 0.05 }, 'LUK.19.4'],
                  [{ trust: 0.06, fear: -0.04 }, 'LUK.19.7']),

  // he reads the world as a chain of command, so a man under law is legible to
  // him and a man who breaks it is not
  centurion: eyes([{ trust: 0.08, resolve: 0.05 }, 'MAT.8.9'],
                  [{ trust: -0.06 }, 'MAT.8.8']),

  // he wants the conversation and cannot be seen having it
  nicodemus: eyes([{ trust: 0.07, fear: 0.05 }, 'JHN.3.2'],
                  [{ trust: -0.05 }, 'JHN.19.39']),

  // the thief in the camp, and the same fear as Jonah for the same reason: the
  // righteous are the ones who will ask him what he has under his tent
  achan: eyes([{ fear: 0.08, trust: -0.06 }, 'JOS.7.19'],
              [{ trust: 0.06, fear: -0.04 }, 'JOS.7.21']),

  /* ── The rest ────────────────────────────────────────────────────────────*/

  // he wants to be worthy of it, and that is exactly the disposition that
  // swears more than it can keep
  peter: eyes([{ trust: 0.07, resolve: 0.06 }, 'MAT.26.33'],
              [{ resolve: -0.05 }, 'LUK.22.32']),

  // 'I will not stretch forth mine hand.' The restraint was never conditional
  // on the other man deserving it, so a transgressor moves almost nothing.
  'david-cave': eyes([{ resolve: 0.05 }, '1SA.24.6'],
                     [{ trust: -0.03 }, '1SA.24.12']),

  // she interposes for the one in the wrong — that is the entire scene, and it
  // means a transgressor raises her resolve rather than lowering it
  abigail: eyes([{ trust: 0.06 }, '1SA.25.33'],
                [{ resolve: 0.07, trust: -0.03 }, '1SA.25.24']),

  // he runs to meet the one who went wrong. Anything else would be a different
  // parable.
  'watching-father': eyes([{ trust: 0.04, resolve: 0.03 }, 'LUK.15.31'],
                          [{ trust: 0.09, resolve: 0.06 }, 'LUK.15.20']),

  // their help turns harmful by going on too long, and a righteous man
  // suffering is precisely what they cannot stop explaining
  'jobs-friends': eyes([{ resolve: 0.08, trust: -0.04 }, 'JOB.13.4'],
                       [{ resolve: -0.06 }, 'JOB.2.13']),

  // she serves harder in front of someone she thinks is watching
  martha: eyes([{ resolve: 0.06, fear: 0.03 }, 'LUK.10.40'],
               [{ trust: -0.05 }, 'LUK.10.41']),

  // she does not get up for the righteous and does not get up for anyone else
  mary: eyes([{ resolve: 0.04, trust: 0.05 }, 'LUK.10.39'],
             [{ trust: -0.02 }, 'LUK.10.42']),

  // 'I, even I only, am left.' A righteous player is the standing refutation of
  // the thing that is actually breaking him.
  elijah: eyes([{ trust: 0.07, resolve: 0.07 }, '1KI.19.18'],
               [{ resolve: -0.06, fear: 0.03 }, '1KI.19.10']),

  /* ── Considered, and deliberately unmoved ────────────────────────────────*/

  // she sees the angel whichever kind of man is on her back, and turns aside
  // for the transgressor exactly as she does for the just
  'balaams-donkey': BLIND,

  // he is opened by persistence and by nothing else. Reputation is what he
  // explicitly does not weigh, so weighing it here would undo the arc.
  'unjust-judge': BLIND,
};

export function readingFor(arcId: string, covenant: Covenant): Reading {
  return (EYES[arcId] ?? (() => INDIFFERENT))(covenant);
}
