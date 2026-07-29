import { describe, expect, it } from 'vitest';
import { RelationGraph } from '../providence/relations';

/**
 * The same story, run twice.
 *
 * First through the bookkeeping every game already has: a number per character,
 * moved up and down by events. Then through Providence. The point is not that
 * one is longer than the other, it is that the first one CANNOT represent the
 * difference between the two betrayals, however many lines you give it.
 */

/** What shipping games actually do. A score per character, and events adjust it. */
class PlainReputation {
  private readonly score = new Map<string, number>();
  readonly events: string[] = [];

  private nudge(who: string, by: number): void {
    this.score.set(who, (this.score.get(who) ?? 0) + by);
  }

  of(who: string): number {
    return this.score.get(who) ?? 0;
  }

  betray(actor: string, victim: string): void {
    // one constant, because there is nowhere to put the relationship
    this.nudge(actor, -10);
    this.events.push(`${actor} betrayed ${victim}: -10`);
  }

  lend(_from: string, to: string, amount: number): void {
    this.nudge(to, -amount);
    this.events.push(`${to} owes ${amount}`);
  }

  /** Someone else pays. The debtor's number goes back up and that is all. */
  rescue(_payer: string, debtor: string, amount: number): void {
    this.nudge(debtor, amount);
    this.events.push(`${debtor} rescued: +${amount}`);
  }
}

describe('the same events, with and without Providence', () => {
  it('shows what a reputation number structurally cannot express', () => {
    const cast = { player: 'player', passerby: 'passerby', sworn: 'sworn-ally' };

    /* ---------- before ---------- */
    const plain = new PlainReputation();
    plain.betray(cast.player, cast.passerby);
    const afterFirst = plain.of(cast.player);
    plain.betray(cast.player, cast.sworn);
    const afterSecond = plain.of(cast.player);

    const plainCostOfStranger = afterFirst - 0;
    const plainCostOfAlly = afterSecond - afterFirst;
    // the two betrayals are indistinguishable, because the model has no bonds
    expect(plainCostOfStranger).toBe(plainCostOfAlly);

    /* ---------- after ---------- */
    const graph = new RelationGraph();
    graph.bind(cast.player, cast.passerby, 'stranger', 0.5);
    graph.bind(cast.player, cast.sworn, 'covenant', 0.5);
    graph.bind(cast.sworn, 'his-brother', 'kin', 0.9);

    const light = graph.commit({ kind: 'betray', actor: cast.player, toward: cast.passerby });
    const heavy = graph.commit({ kind: 'betray', actor: cast.player, toward: cast.sworn });

    expect(heavy.weight).toBeGreaterThan(light.weight);
    expect(heavy.weight / light.weight).toBe(5);

    // and the second one reached someone who was never in the room
    expect(light.reached).toEqual([]);
    expect(heavy.reached).toContain('his-brother');

    // both rulings can say where they come from
    expect(heavy.because).toBe('PSA.41.9');

    console.log(`
  BEFORE   a number per character
    betray a passerby       ${plainCostOfStranger}
    betray a sworn ally     ${plainCostOfAlly}          same event, same cost
    who else is affected    nobody
    why                     no answer available

  AFTER    Providence
    betray a passerby       -${light.weight}
    betray a sworn ally     -${heavy.weight}          ${heavy.weight / light.weight}x, from the bond that broke
    who else is affected    ${heavy.reached.join(', ') || 'nobody'}
    why                     ${heavy.because}
`);
  });

  it('shows a rescue that costs the rescuer, which the flat model gives away free', () => {
    /* ---------- before ---------- */
    const plain = new PlainReputation();
    plain.lend('creditor', 'ruined', 50);
    plain.rescue('friend', 'ruined', 50);
    // the debt vanished and nobody paid for it
    expect(plain.of('ruined')).toBe(0);
    expect(plain.of('friend')).toBe(0);

    /* ---------- after ---------- */
    const graph = new RelationGraph();
    graph.bind('friend', 'ruined', 'covenant', 1); // close, but not kin
    graph.bind('boaz', 'ruined', 'kin', 0.6);
    graph.commit({ kind: 'lend', actor: 'creditor', toward: 'ruined', amount: 50 });

    // the closest friend in the world cannot do it
    const refused = graph.commit({ kind: 'redeem', actor: 'friend', toward: 'ruined' });
    expect(refused.refused).toBe('only a kinsman may redeem');
    expect(graph.debtOf('ruined')).toBe(50);

    graph.commit({ kind: 'redeem', actor: 'boaz', toward: 'ruined' });
    expect(graph.debtOf('ruined')).toBe(0);
    expect(graph.debtOf('boaz')).toBe(50); // it moved, it did not evaporate

    console.log(`
  BEFORE   rescue is a number going back up
    debtor after rescue     ${plain.of('ruined')}
    rescuer after rescue    ${plain.of('friend')}           helping cost nothing
    who may rescue          anyone

  AFTER    Providence
    debtor after rescue     0
    rescuer after rescue    50          the debt moved onto him
    who may rescue          a kinsman; the closest friend was refused
    why                     LEV.25.25
`);
  });

  it('keeps a forgiven deed in the record, where a counter would erase it', () => {
    /* ---------- before ---------- */
    const plain = new PlainReputation();
    plain.betray('debtor', 'victim');
    plain.rescue('victim', 'debtor', 10); // "forgiven" by adding the points back
    expect(plain.of('debtor')).toBe(0); // as if it never happened

    /* ---------- after ---------- */
    const graph = new RelationGraph();
    graph.bind('victim', 'debtor', 'kin', 0.8);
    graph.commit({ kind: 'betray', actor: 'debtor', toward: 'victim' });
    graph.commit({ kind: 'forgive', actor: 'victim', toward: 'debtor' });

    expect(graph.holdingsOf('victim').some((h) => h.good === 'grievance')).toBe(false);
    expect(graph.ledger.map((j) => j.deed)).toEqual(['betray', 'forgive']);

    console.log(`
  BEFORE   forgiveness is addition
    claim outstanding       none
    record of the betrayal  gone, the number is back where it started

  AFTER    Providence
    claim outstanding       none
    record of the betrayal  still in the ledger, both deeds
    why                     MAT.18.22
`);
  });
});
