import { DEED_SOURCE, type Deed } from './relations';

/**
 * Gloo advises, we decide.
 *
 * Order is fixed: our own rules first, the model only if we still cannot tell,
 * then a check on whatever comes back. Anything outside the vocabulary, or
 * without a passage behind it, is refused.
 *
 * Not distrust of the model. A moral engine whose rules a generative system can
 * rewrite at runtime does not have rules.
 */

export type DeedKind = Deed['kind'];

export interface Proposal {
  readonly kind: string;
  readonly because: string;
  readonly confidence?: number;
}

export interface Verdict {
  readonly kind: DeedKind | null;
  readonly because: string | null;
  /** How the answer was reached, so a log can always show who decided. */
  readonly decidedBy: 'engine' | 'model' | 'refused';
  readonly reason?: string;
}

/** Asks an external model for a reading. Injected, so tests need no network. */
export type Proposer = (action: string) => Promise<Proposal | null>;

const KNOWN = new Set<string>(Object.keys(DEED_SOURCE));
const USFM = /^[A-Z0-9]{3}\.\d+(\.\d+)?$/;

/**
 * Words the engine recognises on its own. Kept deliberately small: the point is
 * that the engine answers what it can without help, not that it answers
 * everything.
 */
const SYNONYMS: Record<string, DeedKind> = {
  betray: 'betray', betrayal: 'betray', trahir: 'betray', trahison: 'betray',
  bless: 'bless', blessing: 'bless', benir: 'bless',
  steal: 'steal-blessing', 'steal-blessing': 'steal-blessing', voler: 'steal-blessing',
  sell: 'sell-birthright', 'sell-birthright': 'sell-birthright',
  kill: 'shed-blood', murder: 'shed-blood', 'shed-blood': 'shed-blood', tuer: 'shed-blood',
  lend: 'lend', loan: 'lend', preter: 'lend',
  redeem: 'redeem', ransom: 'redeem', racheter: 'redeem',
  forgive: 'forgive', pardon: 'forgive', pardonner: 'forgive',
};

export class Interpreter {
  private readonly propose: Proposer | null;
  private modelCalls = 0;
  private refusals = 0;

  constructor(propose: Proposer | null = null) {
    this.propose = propose;
  }

  get consulted(): number {
    return this.modelCalls;
  }

  get refused(): number {
    return this.refusals;
  }

  /** What the engine can settle alone, without any model. */
  private byRule(action: string): DeedKind | null {
    const normalised = action.trim().toLowerCase();
    if (KNOWN.has(normalised)) return normalised as DeedKind;
    if (SYNONYMS[normalised]) return SYNONYMS[normalised] as DeedKind;
    // a compound phrase still resolves if it carries a word the engine owns
    for (const word of normalised.split(/[^a-z-]+/)) {
      if (SYNONYMS[word]) return SYNONYMS[word] as DeedKind;
    }
    return null;
  }

  /**
   * The three steps, in order. Note that a proposal is validated even when it
   * looks reasonable: the check is structural, not a matter of taste.
   */
  async interpret(action: string): Promise<Verdict> {
    const own = this.byRule(action);
    if (own) {
      return { kind: own, because: DEED_SOURCE[own], decidedBy: 'engine' };
    }

    if (!this.propose) {
      return { kind: null, because: null, decidedBy: 'refused', reason: 'unknown action and no adviser available' };
    }

    this.modelCalls += 1;
    const proposal = await this.propose(action).catch(() => null);
    if (!proposal) {
      this.refusals += 1;
      return { kind: null, because: null, decidedBy: 'refused', reason: 'the adviser returned nothing' };
    }

    const check = this.validate(proposal);
    if (check) {
      this.refusals += 1;
      return { kind: null, because: null, decidedBy: 'refused', reason: check };
    }

    const kind = proposal.kind as DeedKind;
    return { kind, because: DEED_SOURCE[kind], decidedBy: 'model' };
  }

  /** Returns the reason to refuse, or null when the proposal is admissible. */
  private validate(proposal: Proposal): string | null {
    if (!KNOWN.has(proposal.kind)) {
      // the model may not extend the vocabulary, only choose within it
      return `proposed "${proposal.kind}", which is outside the engine's vocabulary`;
    }
    if (!USFM.test(proposal.because)) {
      return `proposed a passage reference the engine cannot parse: "${proposal.because}"`;
    }
    if (proposal.because !== DEED_SOURCE[proposal.kind as DeedKind]) {
      // the deed and the passage must agree, or the citation is decorative
      return `cited ${proposal.because} for "${proposal.kind}", which the engine anchors at ${DEED_SOURCE[proposal.kind as DeedKind]}`;
    }
    if (proposal.confidence !== undefined && proposal.confidence < 0.5) {
      return `was only ${Math.round(proposal.confidence * 100)}% sure`;
    }
    return null;
  }
}
