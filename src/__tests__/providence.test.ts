import { describe, expect, it } from 'vitest';
import { Actor, blankWorld } from '../providence/Actor';
import { DAVID_IN_THE_CAVE, JONAH, LIBRARY, PETER, RUTH } from '../providence/arcs';
import type { WorldView } from '../providence/types';

const world = (over: Partial<Omit<WorldView, 'timeInNode'>> = {}): Omit<WorldView, 'timeInNode'> => ({
  ...blankWorld(),
  distanceToPlayer: 20,
  ...over,
});

/** Run the arc until it reaches `target`, or fail loudly after `limit` seconds. */
function runUntil(actor: Actor, target: string, w: Partial<Omit<WorldView, 'timeInNode'>>, limit = 120): void {
  for (let t = 0; t < limit; t++) {
    if (actor.state === target) return;
    actor.update(1, world(w));
  }
  throw new Error(`"${actor.arc.id}" stalled in "${actor.state}" instead of reaching "${target}".`);
}

describe('Jonah — the quest-giver who runs from his own errand', () => {
  it('flees the errand instead of waiting for the player', () => {
    const jonah = new Actor(JONAH);
    jonah.update(1, world({ errand: 'nineveh' }));
    expect(jonah.state).toBe('fleeing');
    // the point of the arc: he actively increases distance to the objective
    expect(jonah.directive.move).toBe('away-from-errand');
    expect(jonah.directive.refusing).toBe(true);
  });

  it('is stopped by circumstance, returns, obeys, and then resents it', () => {
    const jonah = new Actor(JONAH);
    runUntil(jonah, 'caught', { errand: 'nineveh' });
    runUntil(jonah, 'returning', { errand: 'nineveh' });
    runUntil(jonah, 'obeying', { errand: 'nineveh', distanceToPlayer: 1 });
    // Jonah 4: he does the thing and is furious about it
    runUntil(jonah, 'sulking', { errand: 'nineveh', distanceToPlayer: 1 });
    expect(jonah.journal.map((e) => e.because)).toContain('JON.4.1');
  });
});

describe('Peter — loyalty that breaks and can be repaired', () => {
  it('denies the player under sustained threat', () => {
    const peter = new Actor(PETER);
    runUntil(peter, 'denying', { underThreat: true });
    expect(peter.directive.refusing).toBe(true);
    expect(peter.directive.companion).toBeUndefined();
  });

  it('cannot be bought back, only restored by kindness actually witnessed', () => {
    const peter = new Actor(PETER);
    runUntil(peter, 'denying', { underThreat: true });
    runUntil(peter, 'weeping', {});

    // no amount of waiting alone brings him back
    for (let t = 0; t < 40; t++) peter.update(1, world({ kindnessesWitnessed: 2 }));
    expect(peter.state).toBe('weeping');

    runUntil(peter, 'restored', { kindnessesWitnessed: 3 });
    expect(peter.directive.companion).toBe(true);
  });

  it('returns to your side if the danger passes before he breaks', () => {
    const peter = new Actor(PETER);
    peter.update(1, world({ underThreat: true }));
    expect(peter.state).toBe('pressed');
    runUntil(peter, 'following', { underThreat: false });
    expect(peter.state).toBe('following');
  });
});

describe('Ruth — the companion who is never recruited', () => {
  it('will not join for proximity alone', () => {
    const ruth = new Actor(RUTH);
    for (let t = 0; t < 60; t++) ruth.update(1, world({ distanceToPlayer: 1 }));
    expect(ruth.state).toBe('watching');
    expect(ruth.directive.companion).toBeUndefined();
  });

  it('binds herself once she has seen the player act, and then has no exit', () => {
    const ruth = new Actor(RUTH);
    runUntil(ruth, 'steadfast', { distanceToPlayer: 1, kindnessesWitnessed: 2 });
    expect(ruth.directive.companion).toBe(true);
    const steadfast = RUTH.nodes.find((n) => n.id === 'steadfast');
    expect(steadfast?.transitions).toHaveLength(0);
  });
});

describe('David in the cave — the enemy who spares you', () => {
  it('does not strike when it holds a lethal advantage', () => {
    const david = new Actor(DAVID_IN_THE_CAVE);
    david.update(1, world({ hasLethalAdvantage: true, distanceToPlayer: 1 }));
    expect(david.state).toBe('advantage');

    runUntil(david, 'restraint', { hasLethalAdvantage: true, distanceToPlayer: 1 });
    expect(david.directive.move).toBe('away-from-player');

    runUntil(david, 'proof', { distanceToPlayer: 12 });
    expect(david.journal.map((e) => e.because)).toContain('1SA.24.11');
  });
});

describe('library invariants', () => {
  it('every transition names the passage it comes from', () => {
    for (const arc of LIBRARY) {
      for (const node of arc.nodes) {
        for (const t of node.transitions) {
          expect(t.because, `${arc.id}/${node.id} -> ${t.to}`).toMatch(/^[A-Z0-9]{3}\.\d+(\.\d+)?$/);
        }
      }
    }
  });

  it('every transition points at a node that exists', () => {
    for (const arc of LIBRARY) {
      const ids = new Set(arc.nodes.map((n) => n.id));
      expect(ids.has(arc.initial), `${arc.id} initial`).toBe(true);
      for (const node of arc.nodes) {
        for (const t of node.transitions) {
          expect(ids.has(t.to), `${arc.id}/${node.id} -> ${t.to}`).toBe(true);
        }
      }
    }
  });

  it('fires at most one transition per tick, so a change of heart is never skipped over', () => {
    const peter = new Actor(PETER);
    const event = peter.update(1, world({ underThreat: true }));
    expect(event?.to).toBe('pressed');
    expect(peter.journal).toHaveLength(1);
  });
});
