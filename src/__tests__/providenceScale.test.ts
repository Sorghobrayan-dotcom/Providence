import { describe, expect, it } from 'vitest';
import { RelationGraph } from '../providence/relations';

/**
 * The claim under test is that the graph can carry a populated world rather
 * than a demo cast. It is asserted by growth, not by a stopwatch: a wall-clock
 * budget would be flaky on a loaded machine, whereas the SHAPE of the curve is
 * what actually distinguishes an indexed lookup from a scan.
 */

function populate(agents: number): RelationGraph {
  const g = new RelationGraph();
  for (let i = 1; i < agents; i++) {
    // a household chain plus a covenant across the ring, so degrees stay small
    g.bind(`a${i - 1}`, `a${i}`, i % 3 === 0 ? 'kin' : 'household', 0.5);
    if (i % 50 === 0) g.bind(`a${i}`, `a${(i + 500) % agents}`, 'covenant', 0.8);
  }
  return g;
}

function timeQueries(g: RelationGraph, agents: number, samples = 20000): number {
  const start = performance.now();
  for (let i = 0; i < samples; i++) {
    const n = i % (agents - 1);
    g.bond(`a${n}`, `a${n + 1}`);
    g.house(`a${n}`);
    g.debtOf(`a${n}`);
  }
  return performance.now() - start;
}

describe('the graph carries a populated world', () => {
  it('builds ten thousand agents and still answers instantly', () => {
    const g = populate(10_000);
    const start = performance.now();
    for (let i = 0; i < 5000; i++) {
      expect(g.bond(`a${i}`, `a${i + 1}`)).not.toBe(undefined);
      g.house(`a${i}`);
    }
    const elapsed = performance.now() - start;
    // generous on purpose: a linear scan over 10k ties would be far past this
    expect(elapsed).toBeLessThan(2000);
  });

  it('costs about the same per query at 10x the population, which a scan would not', () => {
    const small = timeQueries(populate(1_000), 1_000);
    const large = timeQueries(populate(10_000), 10_000);

    /* With indexes the per-query cost is flat, so the ratio hovers near 1.
       With linear scans it would track the population and land near 10.
       The bar is set at 4 to leave room for noise while still failing loudly
       if someone reintroduces a full walk of the relation list. */
    const ratio = large / Math.max(small, 0.5);
    expect(ratio).toBeLessThan(4);
  });

  it('keeps deeds correct while a good changes hands repeatedly', () => {
    const g = new RelationGraph();
    g.bind('holder0', 'holder1', 'kin', 0.9);
    g.grant('birthright', 'holder0', 'birth', 100);

    // sell it back and forth: the holder index must follow every move
    for (let i = 0; i < 200; i++) {
      const from = i % 2 === 0 ? 'holder0' : 'holder1';
      const to = i % 2 === 0 ? 'holder1' : 'holder0';
      const sale = g.commit({ kind: 'sell-birthright', actor: from, toward: to, price: 1 });
      expect(sale.refused, `move ${i}`).toBeUndefined();
    }
    /* Exactly one birthright exists and only the last buyer holds it. The 200th
       move runs at i=199, which is odd, so it travels back to holder0. */
    expect(g.holdingsOf('holder0').filter((h) => h.good === 'birthright')).toHaveLength(1);
    expect(g.holdingsOf('holder1').filter((h) => h.good === 'birthright')).toHaveLength(0);
  });

  it('answers a debt query without walking everyone else s holdings', () => {
    const g = new RelationGraph();
    for (let i = 0; i < 5_000; i++) g.commit({ kind: 'lend', actor: 'bank', toward: `a${i}`, amount: 10 });
    const start = performance.now();
    for (let i = 0; i < 5_000; i++) expect(g.debtOf(`a${i}`)).toBe(10);
    expect(performance.now() - start).toBeLessThan(1500);
  });
});
