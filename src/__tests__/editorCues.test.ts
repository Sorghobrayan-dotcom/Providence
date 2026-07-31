import { describe, expect, it } from 'vitest';

import { cueFor, namesAControl, plainly } from '../editor/Cues';
import { LIBRARY, findArc } from '../providence/arcs';
import type { Arc } from '../providence/types';

/**
 * The cues are prose, and prose rots. These are the three ways it rots.
 *
 * It can name a control that was renamed or removed, and then the tool lies to
 * the person holding it. It can be written against a node that no longer
 * exists, which is invisible until someone opens that arc and gets nothing. And
 * a headline arc can grow a node that nobody writes a cue for, which is exactly
 * the hole this file was built to close.
 */

/** The arcs a first-time viewer is expected to open, and which must be complete. */
const HEADLINE = [
  'jonah', 'peter', 'ruth', 'david-cave',
  'balaams-donkey', 'watching-father', 'unjust-judge', 'abigail',
];

function nodesOf(arc: Arc): readonly string[] {
  return arc.nodes.map((n) => n.id);
}

describe('a cue may only name a control that is on the screen', () => {
  it('does not accept the letter s occurring inside an ordinary word', () => {
    expect(namesAControl('he stands still and says nothing to anyone')).toBe(true); // "nothing"
    expect(namesAControl('he stands there')).toBe(false);
    expect(namesAControl('press S')).toBe(true);
  });

  it('names at least one, for every node of every headline arc', () => {
    for (const id of HEADLINE) {
      const arc = findArc(id);
      expect(arc, `${id} is not in the library`).toBeDefined();
      for (const node of (arc as Arc).nodes) {
        const cue = cueFor(id, node.id, node.directive);
        expect(namesAControl(cue.next), `${id}.${node.id} names no control: "${cue.next}"`).toBe(true);
      }
    }
  });
});

describe('every headline arc is written out in full', () => {
  it('has a cue for each of its nodes, not the fallback', () => {
    for (const id of HEADLINE) {
      const arc = findArc(id) as Arc;
      for (const node of nodesOf(arc)) {
        const directive = arc.nodes.find((n) => n.id === node)?.directive;
        const cue = cueFor(id, node, directive as never);
        expect(cue.next, `${id}.${node} fell through to the fallback`).not.toContain('No cue written');
      }
    }
  });

  it('says something specific rather than restating the directive', () => {
    for (const id of HEADLINE) {
      const arc = findArc(id) as Arc;
      for (const node of arc.nodes) {
        const cue = cueFor(id, node.id, node.directive);
        expect(cue.doing).not.toBe(plainly(node.directive));
        expect(cue.doing.length).toBeGreaterThan(20);
      }
    }
  });
});

describe('an arc with nothing written still says something true', () => {
  it('reads the directive out rather than inventing an instruction', () => {
    const cue = cueFor('no-such-arc', 'no-such-node', { move: 'hold', posture: 'waiting', refusing: true });
    expect(cue.doing).toBe('holding still, refusing what you asked · waiting');
    expect(cue.next).toContain('No cue written');
  });

  it('covers every arc in the library one way or the other', () => {
    for (const arc of LIBRARY) {
      for (const node of arc.nodes) {
        const cue = cueFor(arc.id, node.id, node.directive);
        expect(cue.doing.length, `${arc.id}.${node.id} says nothing`).toBeGreaterThan(0);
        expect(cue.next.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('the directive in words', () => {
  it('puts the movement first and the posture last', () => {
    expect(plainly({ move: 'toward-player', posture: 'sworn', companion: true }))
      .toBe('coming toward you, with you · sworn');
  });

  it('names the one arc allowed to overrule the player', () => {
    expect(plainly({ move: 'hold', posture: 'lying-down', refusing: true, overridesInput: true }))
      .toContain('overruling your input');
  });
});
