/**
 * The conversation, as a state machine.
 *
 * Until this existed the editor had no notion of addressing anybody. There were
 * two keys that incremented two counters in the world, and they applied to
 * whoever happened to be loaded from wherever you happened to be standing. That
 * is a debug harness, not a meeting: you cannot walk up to a man and talk to
 * him, so nothing that follows can read as him answering you.
 *
 * Everything here is arithmetic on a distance, deliberately, so it can be
 * asserted without a DOM the way Bearing and Cues are. The editor draws the
 * affordance and the menu; this decides when there is one.
 *
 * The rule that shapes the rest: an open conversation does not survive the
 * character changing state. If Jonah decides to run while the menu is open, the
 * menu closes. A soul that waits politely for the player to finish choosing is
 * the fiction this whole project exists to refuse.
 */

export type EncounterState = 'away' | 'near' | 'open';

/** Why a conversation ended without the player closing it. */
export type Ending = 'he-moved' | 'walked-off';

export interface Look {
  /** Distance to the player, metres, on the same scale the arcs read. */
  readonly metres: number;
  /** His arc changed state this tick. */
  readonly moved: boolean;
}

export interface Beat {
  readonly state: EncounterState;
  /**
   * Fetch his opening line now. True once per approach, far enough out that the
   * walk pays for the round trip instead of the player waiting through it.
   */
  readonly prepare: boolean;
  readonly ended: Ending | null;
}

/** Close enough to speak to. Matches the distance the arcs themselves open at. */
export const REACH_METRES = 3;
/**
 * And far enough to stop being. The gap is hysteresis: without it, standing at
 * exactly three metres flickers the affordance on and off every frame, which
 * reads as a fault in the tool rather than as a threshold.
 */
export const RELEASE_METRES = 3.6;
/**
 * Where his first line is bought, so it is in hand by the time it is wanted.
 *
 * Five and not six, and the metre matters: a newly loaded character is placed
 * about 5.3 m from the player, so a threshold at six fires on the load itself.
 * Clicking down the library would then buy twenty four generated lines for
 * twenty four characters nobody walked up to. It has to mean an approach.
 */
export const PREPARE_METRES = 5;
/** Past this he has left the conversation, whatever the player still wanted. */
export const BREAK_METRES = 6;

/** Far enough back to count as a new approach rather than a shuffle at the edge. */
const RE_ARM_METRES = PREPARE_METRES + 1.5;

export class Encounter {
  private current: EncounterState = 'away';
  private bought = false;

  get state(): EncounterState {
    return this.current;
  }

  /** Advance on this frame's distance. Returns what changed, if anything. */
  observe(look: Look): Beat {
    const prepare = this.shouldPrepare(look.metres);
    let ended: Ending | null = null;

    if (this.current === 'open') {
      if (look.moved) {
        this.current = 'near';
        ended = 'he-moved';
      } else if (look.metres > BREAK_METRES) {
        this.current = 'near';
        ended = 'walked-off';
      }
    }

    /* Not an else. An ending drops back to `near`, and the same tick then
       decides whether `near` is still true of where the two of them are — which
       is how walking off lands at `away` rather than leaving the affordance up
       over an empty field. */
    if (this.current === 'away' && look.metres < REACH_METRES) this.current = 'near';
    else if (this.current === 'near' && look.metres > RELEASE_METRES) this.current = 'away';

    return { state: this.current, prepare, ended };
  }

  /** Speak to him. Returns false when there is nobody within reach to speak to. */
  hail(): boolean {
    if (this.current !== 'near') return false;
    this.current = 'open';
    return true;
  }

  /** Break it off yourself. He stays where he is; you simply stop asking. */
  dismiss(): boolean {
    if (this.current !== 'open') return false;
    this.current = 'near';
    return true;
  }

  /**
   * Somebody else is standing there now.
   *
   * Loading a different arc has to clear this, and not by distance: the new
   * character spawns a few metres off, which is inside the range that keeps an
   * open conversation open. Without this you would go on talking to the man who
   * left, through the mouth of the one who replaced him.
   */
  forget(): void {
    this.current = 'away';
    this.bought = false;
  }

  private shouldPrepare(metres: number): boolean {
    if (metres > RE_ARM_METRES) {
      this.bought = false;
      return false;
    }
    if (metres <= PREPARE_METRES && !this.bought) {
      this.bought = true;
      return true;
    }
    return false;
  }
}
