import { describe, expect, it } from 'vitest';
import { Interpreter, type Proposal } from '../providence/Interpreter';
import { DEED_SOURCE } from '../providence/relations';

const adviser = (p: Proposal | null) => async () => p;

describe('the engine answers alone whenever it can', () => {
  it('never consults the model for something it already knows', async () => {
    const i = new Interpreter(adviser({ kind: 'betray', because: 'PSA.41.9' }));
    for (const word of ['betray', 'trahison', 'forgive', 'pardonner', 'redeem', 'kill']) {
      const v = await i.interpret(word);
      expect(v.decidedBy, word).toBe('engine');
    }
    expect(i.consulted).toBe(0);
  });

  it('resolves a phrase that carries a word it owns', async () => {
    const i = new Interpreter(null);
    const v = await i.interpret('he chose to betray his sworn brother');
    expect(v.kind).toBe('betray');
    expect(v.decidedBy).toBe('engine');
  });
});

describe('the model advises, and only within bounds', () => {
  it('accepts a proposal that stays inside the vocabulary and cites the right passage', async () => {
    const i = new Interpreter(adviser({ kind: 'redeem', because: DEED_SOURCE.redeem, confidence: 0.9 }));
    const v = await i.interpret('paid off his cousin s creditors');
    expect(v.kind).toBe('redeem');
    expect(v.decidedBy).toBe('model');
    expect(i.consulted).toBe(1);
  });

  it('refuses a deed the model invented', async () => {
    const i = new Interpreter(adviser({ kind: 'excommunicate', because: 'MAT.18.17' }));
    const v = await i.interpret('cast him out of the guild');
    expect(v.kind).toBeNull();
    expect(v.decidedBy).toBe('refused');
    expect(v.reason).toContain("outside the engine's vocabulary");
    expect(i.refused).toBe(1);
  });

  it('refuses a known deed cited from the wrong passage', async () => {
    const i = new Interpreter(adviser({ kind: 'forgive', because: 'GEN.1.1' }));
    const v = await i.interpret('let the debt go');
    expect(v.decidedBy).toBe('refused');
    expect(v.reason).toContain('which the engine anchors at');
  });

  it('refuses an unparseable reference', async () => {
    const i = new Interpreter(adviser({ kind: 'bless', because: 'somewhere in Genesis' }));
    expect((await i.interpret('spoke well over him')).decidedBy).toBe('refused');
  });

  it('refuses a proposal the model itself is unsure of', async () => {
    const i = new Interpreter(adviser({ kind: 'betray', because: DEED_SOURCE.betray, confidence: 0.2 }));
    const v = await i.interpret('did something ambiguous');
    expect(v.decidedBy).toBe('refused');
    expect(v.reason).toContain('20% sure');
  });

  it('refuses rather than guessing when no adviser exists', async () => {
    const i = new Interpreter(null);
    const v = await i.interpret('performed an unnamed rite');
    expect(v.decidedBy).toBe('refused');
    expect(i.consulted).toBe(0);
  });

  it('survives an adviser that throws', async () => {
    const i = new Interpreter(async () => {
      throw new Error('gloo unreachable');
    });
    const v = await i.interpret('an unknown act');
    expect(v.decidedBy).toBe('refused');
    expect(v.reason).toContain('returned nothing');
  });
});

describe('every accepted verdict says who decided it', () => {
  it('labels the deciding party on each path', async () => {
    const engine = await new Interpreter(null).interpret('forgive');
    const model = await new Interpreter(adviser({ kind: 'lend', because: DEED_SOURCE.lend })).interpret('fronted him grain');
    const refused = await new Interpreter(adviser({ kind: 'nonsense', because: 'GEN.1.1' })).interpret('???');
    expect([engine.decidedBy, model.decidedBy, refused.decidedBy]).toEqual(['engine', 'model', 'refused']);
  });
});
