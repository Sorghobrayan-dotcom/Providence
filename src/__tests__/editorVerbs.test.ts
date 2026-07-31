import { describe, expect, it } from 'vitest';

import { verbsFor, type Stage, type Verb } from '../editor/Verbs';
import { LIBRARY, findArc } from '../providence/arcs';
import { RelationGraph } from '../providence/relations';
import { covenantOf } from '../providence/covenant';
import type { Arc } from '../providence/types';

/**
 * The menu.
 *
 * One rule decides whether this file is worth having: a verb the player can
 * click must do something to the world or to the graph. A line of dialogue with
 * no engine behind it is the thing every game already has, and it is what the
 * editor would become the moment somebody wrote a label without an `apply`.
 *
 * The second rule is that nothing here is greyed out. The menu proposes and the
 * soul disposes — asking Ruth is always offered, and she is the one who refuses,
 * because a disabled button is the interface lying about who decided.
 */

function stageFor(who: string): Stage {
  const graph = new RelationGraph();
  graph.bind('player', who, 'covenant', 0.9);
  return { world: { requestsMade: 0, kindnessesWitnessed: 0 }, graph, who };
}

/** Everything a verb is allowed to move, in one comparable shape. */
const snapshot = (stage: Stage): string =>
  JSON.stringify([
    stage.world.requestsMade,
    stage.world.kindnessesWitnessed,
    stage.graph.ledger.length,
    stage.graph.holdingsOf(stage.who).length,
    stage.graph.bond('player', stage.who),
  ]);

const labels = (verbs: readonly Verb[]): string[] => verbs.map((v) => v.label);

describe('every verb on the menu reaches the engine', () => {
  it('moves the world or the graph, for every arc and every node in the library', () => {
    for (const arc of LIBRARY) {
      for (const node of arc.nodes) {
        for (const verb of verbsFor(arc, node.id)) {
          const stage = stageFor(arc.id);
          const before = snapshot(stage);
          verb.apply(stage);

          if (verb.kind === 'leave') {
            expect(snapshot(stage), `${arc.id}.${node.id} "${verb.label}" touched the world`).toBe(before);
          } else {
            expect(snapshot(stage), `${arc.id}.${node.id} "${verb.label}" did nothing`).not.toBe(before);
          }
        }
      }
    }
  });

  it('says what it did, so the console can report it', () => {
    const stage = stageFor('peter');
    for (const verb of verbsFor(findArc('peter') as Arc, 'willing')) {
      expect(verb.apply(stage).length).toBeGreaterThan(0);
    }
  });

  it('carries a passage for every verb, since a deed without one is decoration', () => {
    const usfm = /^[A-Z0-9]{3}\.\d+(\.\d+)?$/;
    for (const arc of LIBRARY) {
      for (const verb of verbsFor(arc, arc.initial)) {
        expect(verb.because, `${arc.id} "${verb.label}"`).toMatch(usfm);
      }
    }
  });
});

describe('what asking and being kind actually are', () => {
  it('asks by the same counter the arcs read, not by a new one', () => {
    const stage = stageFor('unjust-judge');
    const ask = verbsFor(findArc('unjust-judge') as Arc, 'dismissive').find((v) => v.kind === 'ask') as Verb;
    for (let i = 0; i < 4; i += 1) ask.apply(stage);
    expect(stage.world.requestsMade).toBe(4);
  });

  it('shows a kindness the character has to have witnessed', () => {
    const stage = stageFor('ruth');
    const kind = verbsFor(findArc('ruth') as Arc, 'watching').find((v) => v.kind === 'kindness') as Verb;
    kind.apply(stage);
    kind.apply(stage);
    expect(stage.world.kindnessesWitnessed).toBe(2);
  });

  it('betrays the character on screen rather than a fixed name', () => {
    const stage = stageFor('ruth');
    const betray = verbsFor(findArc('ruth') as Arc, 'watching').find((v) => v.id === 'betray') as Verb;
    betray.apply(stage);

    const judged = stage.graph.ledger[0];
    expect(judged?.deed).toBe('betray');
    expect(judged?.toward).toBe('ruth');
  });

  it('blesses, which is the one click that puts the player in the right with the Law', () => {
    const stage = stageFor('ruth');
    const bless = verbsFor(findArc('ruth') as Arc, 'watching').find((v) => v.id === 'bless') as Verb;
    expect(covenantOf(stage.graph).standing).toBe('neutral');
    bless.apply(stage);
    expect(covenantOf(stage.graph).standing).toBe('just');
  });
});

describe('the shape of the menu', () => {
  it('opens with asking and ends with leaving, and never runs long', () => {
    for (const arc of LIBRARY) {
      const verbs = verbsFor(arc, arc.initial);
      expect(verbs.length, `${arc.id} offers ${verbs.length}`).toBeLessThanOrEqual(5);
      expect(verbs[0]?.kind).toBe('ask');
      expect(verbs[verbs.length - 1]?.kind).toBe('leave');
    }
  });

  it('offers asking even to the one who will not answer it', () => {
    // Ruth answers nothing and reads what you do. The refusal is hers to make.
    const verbs = verbsFor(findArc('ruth') as Arc, 'watching');
    expect(verbs.some((v) => v.kind === 'ask')).toBe(true);
  });

  it('gives every verb a distinct id, so a click cannot land on two of them', () => {
    for (const arc of LIBRARY) {
      const ids = verbsFor(arc, arc.initial).map((v) => v.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('what the voice is told, as opposed to what the button says', () => {
  it('gives every gesture a man can answer something to answer with', () => {
    for (const arc of LIBRARY) {
      for (const node of arc.nodes) {
        for (const verb of verbsFor(arc, node.id)) {
          const answerable = verb.kind === 'ask' || verb.kind === 'kindness';
          expect(Boolean(verb.told), `${arc.id}.${node.id} ${verb.id}`).toBe(answerable);
        }
      }
    }
  });

  it('tells it about him, rather than handing the model an order meant for the player', () => {
    for (const arc of LIBRARY) {
      for (const node of arc.nodes) {
        for (const verb of verbsFor(arc, node.id)) {
          if (verb.told === undefined) continue;
          expect(verb.told, `${arc.id}.${node.id}`).not.toMatch(/^(Demande|Montre|Ordonne|Redemande|Trahis|Bénis|Laisse)/);
        }
      }
    }
  });
});

describe('the labels are in the language the character answers in', () => {
  it('says what asking means in this particular node', () => {
    const judge = findArc('unjust-judge') as Arc;
    expect(labels(verbsFor(judge, 'dismissive'))[0]).toContain('justice');
    expect(labels(verbsFor(judge, 'wearied'))[0]).not.toContain('justice');

    const peter = findArc('peter') as Arc;
    expect(labels(verbsFor(peter, 'willing'))[0]).toContain('suivre');
    expect(labels(verbsFor(peter, 'weeping'))[0]).toContain('revenir');
  });

  it('does not misgender half the library', () => {
    expect(labels(verbsFor(findArc('ruth') as Arc, 'watching'))).toContain('Trahis-la.');
    expect(labels(verbsFor(findArc('peter') as Arc, 'willing'))).toContain('Trahis-le.');
    expect(labels(verbsFor(findArc('jobs-friends') as Arc, 'coming'))).toContain('Trahis-les.');
  });

  it('promises nothing a verb cannot deliver', () => {
    /* "Recruit Ruth" would be a lie: you can ask, and she decides. Every label
       names the gesture, never the outcome. */
    const forbidden = /recrut|rejoin|obtien|gagne|débloq/i;
    for (const arc of LIBRARY) {
      for (const node of arc.nodes) {
        for (const verb of verbsFor(arc, node.id)) {
          expect(verb.label, `${arc.id}.${node.id}`).not.toMatch(forbidden);
        }
      }
    }
  });
});
