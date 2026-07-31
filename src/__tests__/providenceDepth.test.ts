import { describe, expect, it } from 'vitest';
import { Actor, blankWorld } from '../providence/Actor';
import { PETER, RUTH, DAVID_IN_THE_CAVE } from '../providence/arcs';
import { SAUL, SERPENT } from '../providence/adversaries';
import { RelationGraph } from '../providence/relations';
import { memoryFor } from '../providence/memory';
import type { WorldView } from '../providence/types';

/**
 * The same arc, the same inputs, two different outcomes, because the two
 * characters have different histories with the player. Nothing here sets a flag
 * to make that happen: the arcs read the graph.
 */

const world = (over: Partial<Omit<WorldView, 'timeInNode'>> = {}): Omit<WorldView, 'timeInNode'> => ({
  ...blankWorld(),
  /* Asked, and he came. Peter waits in 'willing' now, so a test about him
     breaking has to get him following first: you cannot break a promise
     nobody asked him to make. */
  requestsMade: 1,
  distanceToPlayer: 4,
  ...over,
});

function run(actor: Actor, seconds: number, w: Partial<Omit<WorldView, 'timeInNode'>>): void {
  for (let t = 0; t < seconds; t++) actor.update(1, world(w));
}

function reach(actor: Actor, target: string, w: Partial<Omit<WorldView, 'timeInNode'>>, limit = 200): number {
  for (let t = 0; t < limit; t++) {
    if (actor.state === target) return t;
    actor.update(1, world(w));
  }
  return -1;
}

describe('a wound reopens faster than it first opened', () => {
  it('breaks Peter sooner the second time, from the same pressure', () => {
    const peter = new Actor(PETER);

    const firstBreak = reach(peter, 'denying', { underThreat: true });
    expect(firstBreak).toBeGreaterThan(0);

    // let him recover all the way back to your side
    reach(peter, 'weeping', {});
    reach(peter, 'restored', { kindnessesWitnessed: 3 });
    expect(peter.state).toBe('restored');

    // and now put him under exactly the same pressure again
    const again = new Actor(PETER);
    again.update(1, world({ underThreat: true })); // -> pressed
    // force a second visit to the wound by walking him through it once
    reach(again, 'denying', { underThreat: true });
    reach(again, 'weeping', {});
    reach(again, 'restored', { kindnessesWitnessed: 3 });
    reach(again, 'pressed', { underThreat: true });
    const secondBreak = reach(again, 'denying', { underThreat: true });

    expect(secondBreak).toBeGreaterThanOrEqual(0);
    expect(secondBreak).toBeLessThan(firstBreak); // the scar did the work
  });
});

describe('coming back costs more when the record says you sold him once', () => {
  it('needs three kindnesses from a clean slate, and more after a betrayal', () => {
    const clean = new RelationGraph();
    clean.bind('peter', 'player', 'covenant', 0.9);
    const trusted = new Actor(PETER, memoryFor(clean, 'peter'));
    reach(trusted, 'denying', { underThreat: true });
    reach(trusted, 'weeping', {});
    reach(trusted, 'restored', { kindnessesWitnessed: 3 });
    expect(trusted.state).toBe('restored');

    const scarred = new RelationGraph();
    scarred.bind('peter', 'player', 'covenant', 0.9);
    scarred.commit({ kind: 'betray', actor: 'player', toward: 'peter' });
    const wary = new Actor(PETER, memoryFor(scarred, 'peter'));
    reach(wary, 'denying', { underThreat: true });
    reach(wary, 'weeping', {});

    // three is no longer enough for a man you have already sold
    run(wary, 40, { kindnessesWitnessed: 3 });
    expect(wary.state).toBe('weeping');

    reach(wary, 'restored', { kindnessesWitnessed: 5 });
    expect(wary.state).toBe('restored');
  });
});

describe('Ruth cannot be bought by kindness aimed at her', () => {
  it('binds to a player who has not touched her household', () => {
    const graph = new RelationGraph();
    graph.bind('ruth', 'her-kinsman', 'kin', 0.9);
    const ruth = new Actor(RUTH, memoryFor(graph, 'ruth'));
    reach(ruth, 'binding', { distanceToPlayer: 2, kindnessesWitnessed: 2 });
    expect(ruth.state).toBe('binding');
  });

  it('refuses the same player, with the same kindness, once he has hurt her kin', () => {
    const graph = new RelationGraph();
    graph.bind('ruth', 'her-kinsman', 'kin', 0.9);
    graph.bind('player', 'her-kinsman', 'household', 0.5);
    graph.commit({ kind: 'betray', actor: 'player', toward: 'her-kinsman' });

    const ruth = new Actor(RUTH, memoryFor(graph, 'ruth'));
    run(ruth, 60, { distanceToPlayer: 2, kindnessesWitnessed: 8 });
    expect(ruth.state).toBe('watching'); // she watched, and she is not moving
  });
});

describe('restraint is a choice, and it can be taken away', () => {
  it('lowers the blade when nothing stands against the player', () => {
    const graph = new RelationGraph();
    graph.bind('david', 'his-brother', 'kin', 0.9);
    const david = new Actor(DAVID_IN_THE_CAVE, memoryFor(graph, 'david'));
    reach(david, 'restraint', { hasLethalAdvantage: true, distanceToPlayer: 1 });
    expect(david.state).toBe('restraint');
  });

  it('does not lower it for a player who harmed his house', () => {
    const graph = new RelationGraph();
    graph.bind('david', 'his-brother', 'kin', 0.9);
    graph.commit({ kind: 'shed-blood', actor: 'player', toward: 'his-brother' });

    const david = new Actor(DAVID_IN_THE_CAVE, memoryFor(graph, 'david'));
    run(david, 80, { hasLethalAdvantage: true, distanceToPlayer: 1 });
    expect(david.state).toBe('advantage'); // blade still up
  });
});

describe('the serpent goes for whoever is already carrying something', () => {
  it('keeps its distance from a player with nothing against him', () => {
    const graph = new RelationGraph();
    const serpent = new Actor(SERPENT, memoryFor(graph, 'serpent'));
    run(serpent, 10, { distanceToPlayer: 9 });
    expect(serpent.state).toBe('coiled');
  });

  it('closes on a player who is carrying a grievance, at the same distance', () => {
    const graph = new RelationGraph();
    graph.bind('serpent', 'player', 'stranger', 0.3);
    graph.commit({ kind: 'betray', actor: 'someone', toward: 'serpent' });
    // the grievance the serpent holds is what draws it in
    graph.commit({ kind: 'betray', actor: 'player', toward: 'serpent' });

    const serpent = new Actor(SERPENT, memoryFor(graph, 'serpent'));
    reach(serpent, 'questioning', { distanceToPlayer: 9 });
    expect(serpent.state).toBe('questioning');
  });
});

describe('Saul does not need you to succeed if you took what was his', () => {
  it('stays friendly to an unremarkable player', () => {
    const graph = new RelationGraph();
    const saul = new Actor(SAUL, memoryFor(graph, 'saul'));
    run(saul, 40, { playerSucceeding: false });
    expect(saul.state).toBe('favouring');
  });

  it('turns immediately on the player holding his blessing', () => {
    const graph = new RelationGraph();
    graph.bind('saul', 'player', 'household', 0.6);
    graph.commit({ kind: 'bless', actor: 'samuel', toward: 'saul', amount: 10 });
    graph.commit({ kind: 'steal-blessing', actor: 'player', toward: 'saul' });

    const saul = new Actor(SAUL, memoryFor(graph, 'saul'));
    saul.update(1, world({ playerSucceeding: false }));
    expect(saul.state).toBe('eyeing');
  });
});

describe('memory is read live, not captured once', () => {
  it('changes a character mid-run when the graph changes under it', () => {
    const graph = new RelationGraph();
    graph.bind('ruth', 'her-kinsman', 'kin', 0.9);
    const ruth = new Actor(RUTH, memoryFor(graph, 'ruth'));

    reach(ruth, 'watching', { distanceToPlayer: 2 });
    // the betrayal happens now, while she is already watching him
    graph.commit({ kind: 'betray', actor: 'player', toward: 'her-kinsman' });
    run(ruth, 40, { distanceToPlayer: 2, kindnessesWitnessed: 6 });
    expect(ruth.state).toBe('watching');
  });
});
