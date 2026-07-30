import type { Arc, ArcEvent, Context, Directive, Disposition, Node, WorldView } from './types';
import { NO_MEMORY, type Memory } from './memory';
import type { Atmosphere } from './atmosphere';

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * A quiet world with nothing happening in it. Host games spread this and
 * override only the signals they actually track, so adding a field to WorldView
 * never breaks an existing integration.
 */
export function blankWorld(): Omit<WorldView, 'timeInNode'> {
  return {
    distanceToPlayer: Infinity,
    hasLethalAdvantage: false,
    underThreat: false,
    kindnessesWitnessed: 0,
    errand: null,
    dangerAhead: false,
    atrocityImminent: false,
    playerReturning: false,
    playerSuffering: false,
    requestsMade: 0,
    playerSucceeding: false,
    observedByOthers: false,
    pathBlocked: false,
    underPressure: false,
    playerDeceived: false,
    spoilUnguarded: false,
    situation: { disorder: 0, unmetNeed: 0, falsehood: 0, worthHearing: 0, clamour: 0, strain: 0 },
  };
}

/**
 * One NPC walking one arc. We own the inner life and return an intent; the host
 * owns position and animation. Keeping that line clean is what lets the same
 * arcs run in Godot, in a canvas, or headless in a test.
 */
export class Actor {
  readonly arc: Arc;
  readonly disposition: Disposition;
  private node: Node;
  private elapsedInNode = 0;
  private driftCarry = 0;
  private placeCarry = 0;
  private readonly history: ArcEvent[] = [];
  /** How many times each node has been entered, so wounds can reopen faster. */
  private readonly visits = new Map<string, number>();
  private memory: Memory;
  private place: Atmosphere | null = null;

  constructor(arc: Arc, memory: Memory = NO_MEMORY) {
    this.arc = arc;
    this.memory = memory;
    this.disposition = { ...arc.start };
    const initial = arc.nodes.find((n) => n.id === arc.initial);
    if (!initial) throw new Error(`Arc "${arc.id}" has no node named "${arc.initial}".`);
    this.node = initial;
    this.visits.set(initial.id, 1);
  }

  get state(): string {
    return this.node.id;
  }

  /** Times this character has already stood where it is standing now. */
  get scars(): number {
    return (this.visits.get(this.node.id) ?? 1) - 1;
  }

  /** Attach the character to a world it can remember things about. */
  remembers(memory: Memory): void {
    this.memory = memory;
  }

  /** Put the character somewhere. The room then weighs on it every second. */
  standsIn(place: Atmosphere | null): void {
    this.place = place;
  }

  get standing(): Atmosphere | null {
    return this.place;
  }

  get directive(): Directive {
    return this.node.directive;
  }

  /** Every transition this NPC has made, each with the passage behind it. */
  get journal(): readonly ArcEvent[] {
    return this.history;
  }

  /** Nudge the inner state. Kindness raises trust, danger raises fear. */
  influence(change: Partial<Disposition>): void {
    for (const key of ['trust', 'fear', 'resolve'] as const) {
      const delta = change[key];
      if (delta !== undefined) this.disposition[key] = clamp01(this.disposition[key] + delta);
    }
  }

  /**
   * Advance the arc. Returns the transition that fired this tick, or null.
   * Only ONE transition fires per tick: a character that skipped three states
   * in a single frame would read as a glitch, not as a change of heart.
   */
  update(dtSeconds: number, world: Omit<WorldView, 'timeInNode'>): ArcEvent | null {
    this.elapsedInNode += dtSeconds;

    // drift is authored per second, so it stays stable whatever the frame rate
    if (this.node.drift) {
      this.driftCarry += dtSeconds;
      while (this.driftCarry >= 1) {
        this.driftCarry -= 1;
        this.influence(this.node.drift);
      }
    }

    /* The room presses whether or not the node drifts, on its own carry, so a
       character standing still in a frightening place still becomes afraid. */
    if (this.place?.weighs) {
      this.placeCarry += dtSeconds;
      while (this.placeCarry >= 1) {
        this.placeCarry -= 1;
        this.influence(this.place.weighs);
      }
    }

    const ctx: Context = {
      disposition: this.disposition,
      world: { ...world, timeInNode: this.elapsedInNode },
      memory: this.memory,
      scars: this.scars,
    };

    /* Collect everything eligible, then let appeal decide. Written-order still
       wins when nothing declares an appeal, so arcs that do not care are
       unaffected. */
    const eligible = this.node.transitions.filter((t) => t.when(ctx));
    if (eligible.length > 0) {
      const transition = eligible.reduce((best, t) =>
        (t.appeal?.(ctx) ?? 0) > (best.appeal?.(ctx) ?? 0) ? t : best,
      );
      const next = this.arc.nodes.find((n) => n.id === transition.to);
      if (!next) throw new Error(`Arc "${this.arc.id}" points at missing node "${transition.to}".`);

      const event: ArcEvent = {
        from: this.node.id,
        to: transition.to,
        because: transition.because,
        note: transition.note,
      };
      this.node = next;
      this.visits.set(next.id, (this.visits.get(next.id) ?? 0) + 1);
      this.elapsedInNode = 0;
      this.driftCarry = 0;
      this.history.push(event);
      return event;
    }
    return null;
  }
}
