/**
 * The two minute visit.
 *
 * The editor tells you what a character is doing and what to press about him,
 * and says nothing at all about the instrument around him: what the row of
 * toggles is for, why two of them are keys, what the four tabs hold, what the
 * console is a log of. A judge with five minutes should not have to infer that
 * from the source, and every one of those answers already exists somewhere in
 * `docs/` where nobody will read it in time.
 *
 * The steps are data and the walking of them is a counter, so both are asserted
 * without a DOM. The one thing that can rot here is an anchor: rename a zone and
 * the tour points at nothing, silently. A test reads the editor's own source and
 * fails if a step names a selector that is no longer in it.
 */

export interface Step {
  /** The zone this step is about. Must exist in the editor's markup. */
  readonly anchor: string;
  readonly title: string;
  readonly says: string;
}

export const STEPS: readonly Step[] = [
  {
    anchor: '#library',
    title: 'The library',
    says: '24 behaviours taken from figures in the text. Click one and it loads into the scene.',
  },
  {
    anchor: '.viewport',
    title: 'The world',
    says: 'Drag anywhere in here to move yourself. Distance is an input almost every arc reads, not scenery.',
  },
  {
    anchor: '.cue',
    title: 'What he is doing',
    says: 'This line says what he is doing and what to press next. It may only name a control that exists, and a test enforces that.',
  },
  {
    anchor: '.hail',
    title: 'Speaking to him',
    says: 'Walk within three metres and an offer to speak appears over his head. He answers in his own words — including when he refuses.',
  },
  {
    anchor: '.flag.verb',
    title: 'The two things you do',
    says: 'Ask, and show a kindness. They are keys rather than toggles because they are yours; everything else in this row is what the world happens to be doing.',
  },
  {
    anchor: '.tabs',
    title: 'The inspector',
    says: 'Soul is his state. Relations is what you have done, to whom, permanently. Place is the room you are both standing in. Grace is the one thing you cannot cause.',
  },
  {
    anchor: '.console',
    title: 'The console',
    says: 'Every line carries the passage it came from, and the verse under it arrived from the platform a moment ago. Nothing in the engine stores that text.',
  },
];

/** The slice of Storage this needs, so a test can pass a fake without a DOM. */
export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const SEEN = 'providence.toured.v1';

export class Tour {
  private readonly store: Store | null;
  private at = -1;

  constructor(store: Store | null) {
    this.store = store;
  }

  /**
   * Offer it once, and never again.
   *
   * Asked on every load it becomes a cookie banner, and a thing you dismiss
   * without reading is worse than nothing: it teaches the reflex of dismissing.
   */
  get worthOffering(): boolean {
    if (!this.store) return true;
    try {
      return this.store.getItem(SEEN) === null;
    } catch {
      return true;
    }
  }

  /** Remember that it has been offered, whichever way the answer went. */
  settle(): void {
    try {
      this.store?.setItem(SEEN, '1');
    } catch {
      // private browsing: it will simply be offered again, which is survivable
    }
  }

  get running(): boolean {
    return this.at >= 0;
  }

  get step(): Step | null {
    return this.at >= 0 ? (STEPS[this.at] ?? null) : null;
  }

  /** One-based, for the "3 of 7" a reader needs to know how long this is. */
  get position(): number {
    return this.at + 1;
  }

  get length(): number {
    return STEPS.length;
  }

  start(): Step | null {
    this.at = 0;
    this.settle();
    return this.step;
  }

  /** The next step, or null when there are none: the tour then stops itself. */
  next(): Step | null {
    if (this.at < 0) return null;
    if (this.at >= STEPS.length - 1) {
      this.stop();
      return null;
    }
    this.at += 1;
    return this.step;
  }

  back(): Step | null {
    if (this.at > 0) this.at -= 1;
    return this.step;
  }

  stop(): void {
    this.at = -1;
    this.settle();
  }
}
