import type { Memory } from './memory';
import type { Situation } from './drives';
export type { Situation } from './drives';

/**
 * Behaviour arcs.
 *
 * Game NPCs never change: a guard patrols until the servers shut down. The
 * figures these are taken from do little else, so the unit is an arc rather than
 * a loop, and it can only be walked in certain directions.
 *
 * Transitions carry a reference and no text. Scripture.ts resolves it at
 * runtime. Take that away and nothing here can explain itself.
 */

/** How the character stands right now, independent of what it is doing. */
export interface Disposition {
  /** Toward the player. Falls under threat, rises with kindness shown. */
  trust: number;
  /** Situational pressure. High fear is what breaks Peter. */
  fear: number;
  /** Commitment to its own errand. Low resolve is what makes Jonah run. */
  resolve: number;
}

export interface WorldView {
  /** Distance to the player, in whatever unit the host engine uses. */
  distanceToPlayer: number;
  /** True while the NPC could land a decisive blow and the player could not answer. */
  hasLethalAdvantage: boolean;
  /** Set by the host game when danger is present (guards, a mob, a hostile crowd). */
  underThreat: boolean;
  /** Kindnesses the player has done that this NPC actually witnessed. */
  kindnessesWitnessed: number;
  /** The errand the NPC was given, if any. */
  errand: string | null;
  /** Danger on the path ahead that the player has not noticed. Balaam's donkey sees this. */
  dangerAhead: boolean;
  /** The player is about to do something irreversible and cruel. */
  atrocityImminent: boolean;
  /** The player is coming back after a long absence. */
  playerReturning: boolean;
  /** The player is in visible distress. */
  playerSuffering: boolean;
  /** How many times the player has asked this NPC for the same thing. */
  requestsMade: number;
  /** The player is visibly winning, gaining renown, outshining this NPC. */
  playerSucceeding: boolean;
  /** Third parties can see this exchange. Some NPCs only speak in private. */
  observedByOthers: boolean;
  /** This NPC's line of sight or path is blocked by a crowd or terrain. */
  pathBlocked: boolean;
  /** Force is being brought against this NPC. Pharaoh relents under it, and only under it. */
  underPressure: boolean;
  /** The player has told this NPC something untrue, and the NPC has found out. */
  playerDeceived: boolean;
  /** Shared loot is lying unguarded within reach. */
  spoilUnguarded: boolean;
  /**
   * How this character reads the room. Optional: arcs that do not use drives
   * never look at it, and a host game that does not model it never sets it.
   */
  situation?: Situation;
  /** Seconds spent in the current node. */
  timeInNode: number;
}

export interface Context {
  readonly disposition: Disposition;
  readonly world: WorldView;
  /** What this character knows about the player, read off the relation graph. */
  readonly memory: Memory;
  /**
   * How many times this character has already been through the node it is
   * standing in. A wound reopens faster than it first opened, so thresholds
   * that depend on this are the difference between a state machine and a
   * character with a history.
   */
  readonly scars: number;
}

/** What the host engine should make the NPC do this tick. */
export interface Directive {
  /** Movement intent, interpreted by the host engine. */
  move: 'toward-player' | 'away-from-player' | 'toward-errand' | 'away-from-errand' | 'hold';
  /** A short tag the game can map to an animation or a barks table. */
  posture: string;
  /** True when the NPC refuses to act on what the player asked. */
  refusing?: boolean;
  /** True when the NPC is available as a companion. */
  companion?: boolean;
  /**
   * The NPC overrides the player's input. Reserved for the few cases where the
   * text has a creature protecting a rider from what the rider cannot see.
   */
  overridesInput?: boolean;
  /** The NPC physically stands in the player's way. */
  blocking?: boolean;
  /** Net effect of this NPC's presence on the player, for hosts that model morale. */
  effectOnPlayer?: 'comfort' | 'harm';
  /** The NPC is openly hostile and will engage. */
  hostile?: boolean;
  /** The NPC offers the player something that looks like a gain. */
  offering?: boolean;
  /** The NPC suppresses the whole party rather than attacking anyone. */
  suppressesParty?: boolean;
  /** The NPC is turning the player's own allies or systems against them. */
  subverting?: boolean;
}

export interface Transition {
  readonly to: string;
  readonly when: (ctx: Context) => boolean;
  /**
   * USFM reference for the passage this transition is drawn from. Fetched live
   * so the engine can state, in the player's own language, why the NPC changed.
   */
  readonly because: string;
  /**
   * A developer-facing gloss for logs and debugging. It is a loose paraphrase
   * written by us, NOT Scripture, and it must never be shown to a player: the
   * only text a player ever reads comes from Scripture.line(), which resolves
   * `because` through the YouVersion Platform API.
   */
  readonly note: string;
  /**
   * Optional. When several transitions are eligible on the same tick, the one
   * with the highest appeal wins instead of the first one written. This is what
   * lets two characters in the same room, seeing the same thing, do opposite
   * things: the options are identical, the pull is not.
   */
  readonly appeal?: (ctx: Context) => number;
}

export interface Node {
  readonly id: string;
  readonly directive: Directive;
  /** Applied once per second while the NPC sits in this node. */
  readonly drift?: Partial<Disposition>;
  readonly transitions: readonly Transition[];
}

export interface Arc {
  readonly id: string;
  /** Name shown to a developer browsing the library, not to the player. */
  readonly label: string;
  /** One line telling a developer what problem this arc solves. */
  readonly solves: string;
  readonly source: string;
  readonly initial: string;
  readonly start: Disposition;
  readonly nodes: readonly Node[];
}

export interface ArcEvent {
  readonly from: string;
  readonly to: string;
  readonly because: string;
  readonly note: string;
}
