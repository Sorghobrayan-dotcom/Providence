import { describe, expect, it } from 'vitest';
import { Actor } from '../providence/Actor';
import { LIBRARY } from '../providence/arcs';
import {
  ABSALOM, ACHAN, CENTURION, DELILAH, GOLIATH, JEZEBEL, NICODEMUS, PHARAOH, SAUL, SERPENT, TEMPTER, ZACCHAEUS,
} from '../providence/adversaries';
import type { WorldView } from '../providence/types';

const world = (over: Partial<Omit<WorldView, 'timeInNode'>> = {}): Omit<WorldView, 'timeInNode'> => ({
  distanceToPlayer: 20,
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
  ...over,
});

function runUntil(actor: Actor, target: string, w: Partial<Omit<WorldView, 'timeInNode'>>, limit = 200): void {
  for (let t = 0; t < limit; t++) {
    if (actor.state === target) return;
    actor.update(1, world(w));
  }
  throw new Error(`"${actor.arc.id}" stalled in "${actor.state}" instead of reaching "${target}".`);
}

describe('The serpent — never fights, and leaves before the consequence', () => {
  it('offers rather than attacks, then withdraws', () => {
    const s = new Actor(SERPENT);
    runUntil(s, 'reframing', { distanceToPlayer: 2 });
    expect(s.directive.offering).toBe(true);
    expect(s.directive.hostile).toBeUndefined();

    runUntil(s, 'withdrawn', { distanceToPlayer: 2 });
    expect(s.directive.move).toBe('away-from-player');
  });
});

describe('Pharaoh — the false surrender', () => {
  it('yields under pressure and takes it back the moment pressure lifts', () => {
    const p = new Actor(PHARAOH);
    runUntil(p, 'relenting', { underPressure: true });
    expect(p.directive.refusing).toBeUndefined();

    runUntil(p, 'hardening', { underPressure: false });
    expect(p.directive.refusing).toBe(true);
  });

  it('can be made to concede repeatedly, which is the point of the arc', () => {
    const p = new Actor(PHARAOH);
    for (let cycle = 0; cycle < 3; cycle++) {
      runUntil(p, 'relenting', { underPressure: true });
      runUntil(p, 'hardening', { underPressure: false });
    }
    const concessions = p.journal.filter((e) => e.to === 'relenting');
    expect(concessions.length).toBe(3);
  });
});

describe('Saul — turns because you succeed', () => {
  it('stays friendly while the player is unremarkable', () => {
    const s = new Actor(SAUL);
    for (let t = 0; t < 60; t++) s.update(1, world({ playerSucceeding: false }));
    expect(s.state).toBe('favouring');
  });

  it('becomes hostile as a direct result of the player doing well', () => {
    const s = new Actor(SAUL);
    runUntil(s, 'striking', { playerSucceeding: true, distanceToPlayer: 3 });
    expect(s.directive.hostile).toBe(true);
    expect(s.journal[0]?.because).toBe('1SA.18.7');
  });
});

describe('Goliath — suppresses the party instead of fighting it', () => {
  it('holds the whole party still while nobody steps forward', () => {
    const g = new Actor(GOLIATH);
    for (let t = 0; t < 40; t++) g.update(1, world({ distanceToPlayer: 30 }));
    expect(g.state).toBe('presenting');
    expect(g.directive.suppressesParty).toBe(true);
    expect(g.directive.move).toBe('hold');
  });

  it('the suppression breaks when one person comes close alone', () => {
    const g = new Actor(GOLIATH);
    runUntil(g, 'answered', { distanceToPlayer: 4 });
    expect(g.directive.suppressesParty).toBeUndefined();
  });
});

describe('Delilah — learns from each lie', () => {
  it('keeps returning to ask while the player keeps deceiving her', () => {
    const d = new Actor(DELILAH);
    for (let t = 0; t < 30; t++) d.update(1, world({ requestsMade: 2, playerDeceived: true }));
    const asks = d.journal.filter((e) => e.to === 'asking');
    expect(asks.length).toBeGreaterThan(0);
    expect(d.state).not.toBe('knowing');
  });

  it('stops asking once told the truth, and leaves', () => {
    const d = new Actor(DELILAH);
    runUntil(d, 'knowing', { requestsMade: 1, playerDeceived: false });
    expect(d.directive.move).toBe('away-from-player');
  });
});

describe('Jezebel — never touches the player', () => {
  it('works through the institutions and stays non-hostile throughout', () => {
    const j = new Actor(JEZEBEL);
    runUntil(j, 'accusing', { playerSucceeding: true });
    expect(j.directive.subverting).toBe(true);
    expect(j.directive.hostile).toBeUndefined();
    expect(j.directive.effectOnPlayer).toBe('harm');
  });
});

describe('Absalom — only works where the player is absent', () => {
  it('takes ground while the player is far away', () => {
    const a = new Actor(ABSALOM);
    runUntil(a, 'flattering', { distanceToPlayer: 40 });
    expect(a.directive.subverting).toBe(true);
  });

  it('is pushed back to the gate simply by the player showing up', () => {
    const a = new Actor(ABSALOM);
    runUntil(a, 'flattering', { distanceToPlayer: 40 });
    runUntil(a, 'waiting-at-the-gate', { distanceToPlayer: 2 });
    expect(a.state).toBe('waiting-at-the-gate');
  });
});

describe('The tempter — quotes correctly, and is answered rather than beaten', () => {
  it('cites a real passage while proposing', () => {
    const t = new Actor(TEMPTER);
    runUntil(t, 'citing', { distanceToPlayer: 2 });
    expect(t.journal.map((e) => e.because)).toContain('MAT.4.6');
    expect(t.directive.hostile).toBeUndefined();
  });

  it('leaves when answered three times, and prevails when it is not', () => {
    const answered = new Actor(TEMPTER);
    runUntil(answered, 'departing', { distanceToPlayer: 2, requestsMade: 3 });
    expect(answered.directive.move).toBe('away-from-player');

    const unanswered = new Actor(TEMPTER);
    runUntil(unanswered, 'prevailing', { distanceToPlayer: 2, requestsMade: 0 });
    expect(unanswered.directive.hostile).toBe(true);
  });
});

describe('The four ordinary ones', () => {
  it('Zacchaeus climbs instead of shoving through the crowd', () => {
    const z = new Actor(ZACCHAEUS);
    runUntil(z, 'climbing', { pathBlocked: true });
    expect(z.directive.posture).toBe('perched');
  });

  it('the centurion carries out the errand without the player present', () => {
    const c = new Actor(CENTURION);
    runUntil(c, 'trusting', { errand: 'heal-servant', distanceToPlayer: 300 });
    expect(c.directive.move).toBe('toward-errand');
    runUntil(c, 'done', { errand: 'heal-servant', distanceToPlayer: 300 });
  });

  it('Nicodemus goes quiet the moment anyone is watching', () => {
    const n = new Actor(NICODEMUS);
    runUntil(n, 'speaking-freely', { observedByOthers: false, distanceToPlayer: 1 });
    runUntil(n, 'distant', { observedByOthers: true, distanceToPlayer: 1 });
    expect(n.state).toBe('distant');
  });

  it('Achan harms the party from inside it, while still counting as a companion', () => {
    const a = new Actor(ACHAN);
    runUntil(a, 'hiding', { spoilUnguarded: true, distanceToPlayer: 2 });
    expect(a.directive.companion).toBe(true);
    expect(a.directive.effectOnPlayer).toBe('harm');
  });
});

describe('the whole library holds together', () => {
  it('every arc is uniquely named, sourced and reachable', () => {
    // no magic number: the library grows, the invariant does not
    const ids = new Set(LIBRARY.map((a) => a.id));
    expect(ids.size).toBe(LIBRARY.length);
    expect(LIBRARY.length).toBeGreaterThanOrEqual(21);

    for (const arc of LIBRARY) {
      const nodeIds = new Set(arc.nodes.map((n) => n.id));
      expect(nodeIds.has(arc.initial), `${arc.id} initial`).toBe(true);
      expect(arc.solves.length, `${arc.id} solves`).toBeGreaterThan(20);
      for (const node of arc.nodes) {
        for (const t of node.transitions) {
          expect(t.because, `${arc.id}/${node.id}`).toMatch(/^[A-Z0-9]{3}\.\d+(\.\d+)?$/);
          expect(nodeIds.has(t.to), `${arc.id}/${node.id} -> ${t.to}`).toBe(true);
        }
      }
    }
  });

  it('every node is reachable from the initial one', () => {
    for (const arc of LIBRARY) {
      const seen = new Set([arc.initial]);
      const queue = [arc.initial];
      while (queue.length) {
        const current = queue.shift() as string;
        const node = arc.nodes.find((n) => n.id === current);
        for (const t of node?.transitions ?? []) {
          if (!seen.has(t.to)) {
            seen.add(t.to);
            queue.push(t.to);
          }
        }
      }
      for (const node of arc.nodes) {
        expect(seen.has(node.id), `${arc.id}/${node.id} is unreachable`).toBe(true);
      }
    }
  });
});
