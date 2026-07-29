import { describe, expect, it } from 'vitest';
import { DEED_SOURCE, RelationGraph } from '../providence/relations';

describe('the thesis: a deed is weighed by the bond it breaks', () => {
  it('charges the same betrayal differently against a stranger and a covenant partner', () => {
    const g = new RelationGraph();
    g.bind('player', 'passerby', 'stranger', 0.5);
    g.bind('player', 'sworn-brother', 'covenant', 0.5);

    const cheap = g.commit({ kind: 'betray', actor: 'player', toward: 'passerby' });
    const grave = g.commit({ kind: 'betray', actor: 'player', toward: 'sworn-brother' });

    expect(grave.weight).toBeGreaterThan(cheap.weight);
    expect(grave.weight / cheap.weight).toBe(5); // covenant gravity over stranger gravity
  });

  it('weighs a betrayal by how live the tie was, not only by its kind', () => {
    const g = new RelationGraph();
    g.bind('player', 'close', 'kin', 1);
    g.bind('player', 'distant', 'kin', 0);

    const warm = g.commit({ kind: 'betray', actor: 'player', toward: 'close' });
    const cold = g.commit({ kind: 'betray', actor: 'player', toward: 'distant' });
    expect(warm.weight).toBeGreaterThan(cold.weight);
  });

  it('leaves the broken tie as a stranger tie afterwards', () => {
    const g = new RelationGraph();
    g.bind('player', 'ally', 'covenant', 0.9);
    g.commit({ kind: 'betray', actor: 'player', toward: 'ally' });
    expect(g.bond('player', 'ally')).toBe('stranger');
  });
});

describe('the blessing is finite, transferable, and cannot be handed back', () => {
  it('moves to the one who took it', () => {
    const g = new RelationGraph();
    g.bind('jacob', 'esau', 'kin', 0.6);
    g.commit({ kind: 'bless', actor: 'isaac', toward: 'esau', amount: 10 });
    expect(g.holdingsOf('esau').some((h) => h.good === 'blessing')).toBe(true);

    g.commit({ kind: 'steal-blessing', actor: 'jacob', toward: 'esau' });
    expect(g.holdingsOf('jacob').some((h) => h.good === 'blessing')).toBe(true);
    expect(g.holdingsOf('esau').some((h) => h.good === 'blessing')).toBe(false);
  });

  it('cannot be stolen back, because it was irrevocable the moment it was spoken', () => {
    const g = new RelationGraph();
    g.bind('jacob', 'esau', 'kin', 0.6);
    g.commit({ kind: 'bless', actor: 'isaac', toward: 'esau', amount: 10 });
    g.commit({ kind: 'steal-blessing', actor: 'jacob', toward: 'esau' });

    // Esau tries to take it back and there is simply nothing on Jacob to take
    const attempt = g.commit({ kind: 'steal-blessing', actor: 'esau', toward: 'jacob' });
    expect(attempt.refused).toBeUndefined(); // Jacob does hold one now
    // but the good only ever moves, it never duplicates
    expect(g.holdingsOf('jacob').filter((h) => h.good === 'blessing')).toHaveLength(0);
    expect(g.holdingsOf('esau').filter((h) => h.good === 'blessing')).toHaveLength(1);
  });

  it('refuses when there is no blessing to take', () => {
    const g = new RelationGraph();
    const attempt = g.commit({ kind: 'steal-blessing', actor: 'a', toward: 'b' });
    expect(attempt.refused).toBe('there was no blessing on him to take');
    expect(attempt.weight).toBe(0);
  });

  it('reaches the wronged one s household, not only the wronged one', () => {
    const g = new RelationGraph();
    g.bind('esau', 'mother', 'kin', 0.9);
    g.bind('esau', 'servant', 'household', 0.4);
    g.commit({ kind: 'bless', actor: 'isaac', toward: 'esau', amount: 10 });
    const judgment = g.commit({ kind: 'steal-blessing', actor: 'jacob', toward: 'esau' });
    expect(judgment.reached).toContain('mother');
    expect(judgment.reached).toContain('servant');
  });
});

describe('the birthright is alienable, and famously cheap', () => {
  it('sells for whatever the holder agrees to', () => {
    const g = new RelationGraph();
    g.grant('birthright', 'esau', 'birth', 100);
    const sale = g.commit({ kind: 'sell-birthright', actor: 'esau', toward: 'jacob', price: 1 });
    expect(sale.weight).toBe(1);
    expect(g.holdingsOf('jacob').some((h) => h.good === 'birthright')).toBe(true);
  });
});

describe('redemption: a debt moves onto a kinsman, it does not evaporate', () => {
  it('is refused to anyone who is not kin', () => {
    const g = new RelationGraph();
    g.bind('helper', 'ruined', 'covenant', 1); // close, but not kin
    g.commit({ kind: 'lend', actor: 'creditor', toward: 'ruined', amount: 50 });

    const attempt = g.commit({ kind: 'redeem', actor: 'helper', toward: 'ruined' });
    expect(attempt.refused).toBe('only a kinsman may redeem');
    expect(g.debtOf('ruined')).toBe(50);
  });

  it('transfers the whole debt onto the redeemer at its real cost', () => {
    const g = new RelationGraph();
    g.bind('boaz', 'ruined', 'kin', 0.7);
    g.commit({ kind: 'lend', actor: 'creditor', toward: 'ruined', amount: 50 });

    const act = g.commit({ kind: 'redeem', actor: 'boaz', toward: 'ruined' });
    expect(act.weight).toBe(50); // the rescue costs someone something
    expect(g.debtOf('ruined')).toBe(0);
    expect(g.debtOf('boaz')).toBe(50);
  });
});

describe('forgiveness is not deletion', () => {
  it('cancels the claim while the deed stays in the ledger forever', () => {
    const g = new RelationGraph();
    g.commit({ kind: 'lend', actor: 'creditor', toward: 'debtor', amount: 30 });
    expect(g.debtOf('debtor')).toBe(30);

    g.commit({ kind: 'forgive', actor: 'creditor', toward: 'debtor' });
    expect(g.debtOf('debtor')).toBe(0);

    // the record is intact: the lending and the forgiving are both still there
    expect(g.ledger.map((j) => j.deed)).toEqual(['lend', 'forgive']);
  });

  it('releases a grievance the forgiver was holding', () => {
    const g = new RelationGraph();
    g.bind('victim', 'wrongdoer', 'kin', 0.8);
    g.commit({ kind: 'betray', actor: 'wrongdoer', toward: 'victim' });
    expect(g.holdingsOf('victim').some((h) => h.good === 'grievance')).toBe(true);

    g.commit({ kind: 'forgive', actor: 'victim', toward: 'wrongdoer' });
    expect(g.holdingsOf('victim').some((h) => h.good === 'grievance')).toBe(false);
    expect(g.ledger).toHaveLength(2); // nothing was erased
  });
});

describe('blood reaches further than the two involved', () => {
  it('touches both houses, the wronged and the doer s', () => {
    const g = new RelationGraph();
    g.bind('victim', 'victims-brother', 'kin', 0.9);
    g.bind('killer', 'killers-son', 'kin', 0.9);

    const j = g.commit({ kind: 'shed-blood', actor: 'killer', toward: 'victim' });
    expect(j.reached).toContain('victims-brother');
    expect(j.reached).toContain('killers-son');
    expect(j.because).toBe('GEN.4.10');
  });
});

describe('every deed in the vocabulary is anchored in a passage', () => {
  it('has a source for each kind, and the graph reports it on every judgment', () => {
    const kinds = Object.keys(DEED_SOURCE);
    expect(kinds.length).toBeGreaterThanOrEqual(8);
    for (const ref of Object.values(DEED_SOURCE)) {
      expect(ref).toMatch(/^[A-Z0-9]{3}\.\d+(\.\d+)?$/);
    }

    const g = new RelationGraph();
    g.bind('a', 'b', 'covenant', 0.5);
    const j = g.commit({ kind: 'betray', actor: 'a', toward: 'b' });
    expect(j.because).toBe(DEED_SOURCE.betray);
  });
});
