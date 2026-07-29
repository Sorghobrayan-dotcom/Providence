/**
 * Grace.
 *
 * Specified in docs/grace.md before any of this was written. Four properties
 * make it sovereign rather than merely generous: no game code can call it, no
 * parameter can shape it, no studio can sell it, and its rate does not move
 * with anything the player did. The last is the one that matters. If grace
 * tracked merit it would be a reward, and rewards are farmed.
 *
 * It also does not undo the loss. It opens a door that was not there.
 */

/** Frozen on purpose. There is no options object anywhere in this module. */
const LAW = Object.freeze({
  /** Desperation must be at least this before an episode can open. */
  threshold: 0.85,
  /** How far it must fall before the episode is considered over. */
  hysteresis: 0.15,
  /** One draw per episode, at this rate. Four in five receive nothing. */
  rate: 0.2,
  /** Game seconds after any episode during which no draw is possible. */
  refractorySeconds: 90,
});

export type GraceOutcome = 'none' | 'watching' | 'given' | 'withheld';

export interface GraceReport {
  readonly outcome: GraceOutcome;
  /** Present only when grace was given: the door that was not there before. */
  readonly opening?: string;
  /** The passage a host may show. Resolved through Scripture, never stored here. */
  readonly because?: string;
}

/**
 * Watches desperation and decides. It is given no way to be asked.
 *
 * `draw` exists so tests can run the distribution deterministically. It is not
 * a difficulty knob: it cannot change the threshold, the rate or the refractory
 * period, only which numbers the coin produces.
 */
export class Grace {
  private readonly draw: () => number;
  private inEpisode = false;
  private drawnThisEpisode = false;
  private cooldown = 0;
  private episodes = 0;
  private answers = 0;

  constructor(draw: () => number = Math.random) {
    this.draw = draw;
  }

  get episodesSeen(): number {
    return this.episodes;
  }

  get answered(): number {
    return this.answers;
  }

  /** Observed rate, for tests and for an honest line in a log. */
  get rate(): number {
    return this.episodes === 0 ? 0 : this.answers / this.episodes;
  }

  /**
   * Advance by `dt` seconds with the current desperation.
   *
   * Nothing about the player is passed in, and that is the design: this method
   * has no way to know whether it is looking at a saint or a monster, so it
   * cannot favour either.
   */
  observe(desperation: number, dtSeconds: number): GraceReport {
    this.cooldown = Math.max(0, this.cooldown - dtSeconds);

    const closing = this.inEpisode && desperation < LAW.threshold - LAW.hysteresis;
    if (closing) {
      this.inEpisode = false;
      this.drawnThisEpisode = false;
      return { outcome: 'none' };
    }

    if (desperation < LAW.threshold) return { outcome: 'none' };

    // opening a new episode
    if (!this.inEpisode) {
      this.inEpisode = true;
      this.drawnThisEpisode = false;
      if (this.cooldown > 0) return { outcome: 'watching' };
    }

    if (this.drawnThisEpisode || this.cooldown > 0) return { outcome: 'watching' };

    /* One draw, now, for this whole episode. Standing here longer buys nothing,
       which is what stops a player from farming a hopeless state. */
    this.drawnThisEpisode = true;
    this.episodes += 1;
    this.cooldown = LAW.refractorySeconds;

    if (this.draw() < LAW.rate) {
      this.answers += 1;
      return {
        outcome: 'given',
        opening: 'a way that was not there a moment ago',
        because: 'EPH.2.8',
      };
    }
    return { outcome: 'withheld' };
  }
}

/**
 * Desperation from the options actually available: one minus the best chance
 * any of them offers. A host that already knows its own number can skip this.
 */
export function desperationFrom(viability: readonly number[]): number {
  if (viability.length === 0) return 1;
  return 1 - Math.max(...viability);
}
