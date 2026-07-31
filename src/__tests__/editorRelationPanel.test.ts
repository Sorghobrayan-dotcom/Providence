// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { RelationPanel } from '../editor/panels';
import { memoryFor } from '../providence/memory';

/**
 * The bug this file exists for.
 *
 * An arc reads its memory of the player off the relation graph, keyed by its
 * own id. The panel's cast was a hard-coded four, so every character except
 * Peter looked up a name that was not in the graph and was handed the blank
 * memory of a stranger. You could betray whoever you liked and Ruth's arc could
 * not see it — the half of the engine that makes deeds matter was unreachable
 * from the editor for twenty-three of the twenty-four arcs.
 *
 * It was invisible on the page because nothing looks wrong: the graph draws,
 * the deed is weighed, the ledger fills. The character simply does not care.
 */

describe('the character on screen is in the world the deeds happen in', () => {
  it('binds a newly focused character to the player', () => {
    const panel = new RelationPanel();
    expect(panel.graph.relation('player', 'ruth')).toBeUndefined();

    panel.focus('ruth', 'covenant');

    const tie = panel.graph.relation('player', 'ruth');
    expect(tie?.bond).toBe('covenant');
  });

  it('lets a betrayal reach the arc that was betrayed', () => {
    const panel = new RelationPanel();
    panel.focus('ruth', 'covenant');

    expect(memoryFor(panel.graph, 'ruth').betrayals).toBe(0);
    panel.graph.commit({ kind: 'betray', actor: 'player', toward: 'ruth' });
    expect(memoryFor(panel.graph, 'ruth').betrayals).toBe(1);
  });

  it('reaches her household as well as her, which is what she actually reads', () => {
    const panel = new RelationPanel();
    panel.focus('ruth', 'covenant');

    panel.graph.commit({ kind: 'betray', actor: 'player', toward: 'his-brother' });
    expect(memoryFor(panel.graph, 'ruth').harmedMyHouse).toBe(true);
  });

  it('does not swear a covenant on the player\'s behalf with an adversary', () => {
    const panel = new RelationPanel();
    panel.focus('goliath', 'stranger');
    expect(panel.graph.relation('player', 'goliath')?.bond).toBe('stranger');
  });

  it('keeps everyone who has been loaded, because the ledger does not forget', () => {
    const panel = new RelationPanel();
    panel.focus('peter', 'covenant');
    panel.graph.commit({ kind: 'betray', actor: 'player', toward: 'peter' });
    panel.focus('ruth', 'covenant');

    expect(panel.graph.relation('player', 'peter')).toBeDefined();
    expect(memoryFor(panel.graph, 'peter').betrayals).toBe(1);
  });

  it('is idempotent, so reloading the same arc does not rebind or double up', () => {
    const panel = new RelationPanel();
    panel.focus('peter', 'covenant');
    panel.graph.commit({ kind: 'betray', actor: 'player', toward: 'peter' });
    const after = panel.graph.relation('player', 'peter');

    panel.focus('peter', 'covenant');
    expect(panel.graph.relation('player', 'peter')).toEqual(after);
  });

  it('offers deeds against whoever is on screen, not against a fixed name', () => {
    const panel = new RelationPanel();
    panel.focus('jonah', 'covenant');
    const labels = [...panel.root.querySelectorAll('.deed')].map((b) => b.textContent);
    expect(labels).toContain('betray jonah');
    expect(labels).not.toContain('betray peter');
  });
});
