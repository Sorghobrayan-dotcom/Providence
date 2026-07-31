// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';

import { GracePanel, PlacePanel, RelationPanel, ringPositions } from '../editor/panels';
import { ATMOSPHERES, DREAD, NOWHERE } from '../providence/atmosphere';

/**
 * The three panels that hold the parts of the library the viewport cannot show.
 *
 * The relation panel's cast is already covered, because getting it wrong made
 * twenty three of the twenty four arcs deaf to every deed. What was left with
 * nothing under it is the rest: the ring the graph is drawn on, the deed buttons
 * that are the only way to commit anything from the editor, the place notes that
 * are the only statement anywhere of what a room actually does, and the grace
 * readout — which is a panel whose entire job is to report a number honestly and
 * would be the easiest thing in the repository to quietly flatter.
 */

const clickDeed = (panel: RelationPanel, label: string): void => {
  const button = [...panel.root.querySelectorAll<HTMLButtonElement>('.deed')]
    .find((b) => b.textContent === label);
  if (!button) throw new Error(`no deed button named "${label}"`);
  button.click();
};

const text = (el: Element): string => el.textContent ?? '';

describe('the ring the graph is drawn on', () => {
  it('puts everyone on one circle, centred in the box', () => {
    const spots = ringPositions(6, 220, 168);
    const radius = spots.map((s) => Math.hypot(s.x - 110, s.y - 84));
    for (const r of radius) expect(r).toBeCloseTo(radius[0] as number, 6);
  });

  it('spaces them evenly, so a cast of five does not bunch', () => {
    const spots = ringPositions(5, 220, 168);
    const gaps = spots.map((s, i) => {
      const next = spots[(i + 1) % spots.length] as { x: number; y: number };
      return Math.hypot(next.x - s.x, next.y - s.y);
    });
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0] as number, 6);
  });

  it('opens at the top, so the same cast lands the same way every redraw', () => {
    const [first] = ringPositions(4, 220, 168);
    expect(first?.x).toBeCloseTo(110, 6);
    expect(first?.y).toBeLessThan(84);
  });

  it('stays inside the box at every size a cast reaches', () => {
    for (const count of [1, 2, 7, 24]) {
      for (const spot of ringPositions(count, 220, 168)) {
        expect(spot.x).toBeGreaterThanOrEqual(0);
        expect(spot.x).toBeLessThanOrEqual(220);
        expect(spot.y).toBeGreaterThanOrEqual(0);
        expect(spot.y).toBeLessThanOrEqual(168);
      }
    }
  });
});

describe('committing a deed from the panel', () => {
  it('says nothing has happened before anything has', () => {
    const panel = new RelationPanel();
    expect(text(panel.root.querySelector('.ledger') as Element)).toContain('nothing has happened');
  });

  it('reports the weight and who it reached', () => {
    const panel = new RelationPanel();
    panel.focus('peter', 'covenant');

    const heard: string[] = [];
    panel.reports((summary) => heard.push(summary));
    clickDeed(panel, 'betray peter');

    expect(heard[0]).toContain('betray weighed');
    expect(heard[0]).toContain('reached his-brother');
  });

  it('charges a sworn ally seven times a stranger, through the buttons', () => {
    const betray = (who: string, bond: 'covenant' | 'stranger'): number => {
      const panel = new RelationPanel();
      panel.focus(who, bond);
      const heard: string[] = [];
      panel.reports((s) => heard.push(s));
      clickDeed(panel, `betray ${who}`);
      return Number(/weighed ([\d.]+)/.exec(heard[0] as string)?.[1]);
    };

    /* Five is the ratio of the bond gravities and `providenceRelations` asserts
       it directly, holding the tie strength equal. What the editor charges is
       seven, and the difference is not a discrepancy: the panel swears a
       covenant at 0.9 and binds a stranger at 0.5, so a sworn tie is both the
       graver kind and the more live one, and betrayal weighs both. */
    expect(betray('peter', 'covenant')).toBe(21);
    expect(betray('goliath', 'stranger')).toBe(3);
  });

  it('says out loud when the engine refuses one', () => {
    const panel = new RelationPanel();
    panel.focus('ruth', 'covenant');

    const heard: string[] = [];
    panel.reports((s) => heard.push(s));
    // nothing has been spoken over her, so there is no blessing to take
    clickDeed(panel, 'steal it back');

    expect(heard[0]).toContain('refused');
    expect(text(panel.root.querySelector('.ledger') as Element)).toContain('refused');
  });

  it('moves a debt onto the kinsman who redeems it, and shows it on him', () => {
    const panel = new RelationPanel();
    clickDeed(panel, 'lend to boaz');
    expect(panel.graph.debtOf('boaz')).toBe(50);

    clickDeed(panel, 'redeem boaz');
    expect(panel.graph.debtOf('boaz')).toBe(0);
    expect(panel.graph.debtOf('his-brother')).toBe(50);
    expect(text(panel.root.querySelector('svg') as Element)).toContain('his-brother (owes 50)');
  });

  it('keeps the deed in the ledger after it is forgiven', () => {
    const panel = new RelationPanel();
    panel.focus('peter', 'covenant');
    clickDeed(panel, 'betray peter');
    clickDeed(panel, 'forgive peter');

    expect(panel.graph.ledger.map((j) => j.deed)).toContain('betray');
    expect(panel.graph.ledger.map((j) => j.deed)).toContain('forgive');
  });
});

describe('the place panel is the only statement of what a room does', () => {
  it('opens on nowhere, which is the control', () => {
    expect(new PlacePanel().place).toBe(NOWHERE);
  });

  it('hands back the room that was picked, and tells whoever asked', () => {
    const panel = new PlacePanel();
    const picked = vi.fn();
    panel.picked(picked);

    const dread = [...panel.root.querySelectorAll<HTMLButtonElement>('.place')]
      .find((b) => b.textContent === DREAD.label);
    dread?.click();

    expect(panel.place).toBe(DREAD);
    expect(picked).toHaveBeenCalledWith(DREAD);
  });

  it('presses exactly one at a time', () => {
    const panel = new PlacePanel();
    const buttons = [...panel.root.querySelectorAll<HTMLButtonElement>('.place')];
    buttons[3]?.click();
    expect(buttons.filter((b) => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
  });

  it('states what the room weighs on the disposition, which is how it reaches every arc', () => {
    const panel = new PlacePanel();
    [...panel.root.querySelectorAll<HTMLButtonElement>('.place')]
      .find((b) => b.textContent === DREAD.label)?.click();

    const note = text(panel.root.querySelector('.place-note') as Element);
    expect(note).toContain('fear +0.07/s');
    expect(note).toContain('resolve -0.03/s');
    expect(note).toContain(DREAD.source);
  });

  it('says plainly when a room weighs nothing, rather than leaving it blank', () => {
    const note = text(new PlacePanel().root.querySelector('.place-note') as Element);
    expect(note).toContain('nothing');
  });

  it('offers every atmosphere the library has', () => {
    const panel = new PlacePanel();
    const labels = [...panel.root.querySelectorAll('.place')].map(text);
    expect(labels).toEqual(ATMOSPHERES.map((a) => a.label));
  });
});

describe('the grace panel reports a number it is not allowed to flatter', () => {
  it('opens idle, and says why nothing is happening', () => {
    const panel = new GracePanel();
    const state = text(panel.root.querySelector('.grace-state') as Element);
    expect(state).toContain('idle');
    expect(state).toContain('0/0');
  });

  it('distinguishes withheld from watching, because they are not the same answer', () => {
    const panel = new GracePanel();

    panel.show({ outcome: 'watching' });
    expect(text(panel.root.querySelector('.grace-state') as Element)).toContain('no draw available');

    panel.show({ outcome: 'withheld' });
    expect(text(panel.root.querySelector('.grace-state') as Element)).toContain('withheld');
  });

  it('marks given and withheld apart without reaching for a colour', () => {
    const panel = new GracePanel();
    panel.show({ outcome: 'given', because: 'EPH.2.8' });
    expect((panel.root.querySelector('.grace-state') as Element).className).toContain('given');

    panel.show({ outcome: 'withheld' });
    expect((panel.root.querySelector('.grace-state') as Element).className).toContain('withheld');
  });

  it('counts what actually happened rather than what the panel was told', () => {
    const panel = new GracePanel();
    // the tally comes off the Grace instance, which no panel method can move
    panel.show({ outcome: 'given', because: 'EPH.2.8' });
    expect(text(panel.root.querySelector('.grace-state') as Element)).toContain('0/0');
  });

  it('tells a reader how to open an episode before it tells them to expect nothing', () => {
    const note = text(new GracePanel().root.querySelector('.grace-note') as Element);
    const howTo = note.indexOf('To see it at all');
    const expectNothing = note.indexOf('expect nothing');
    expect(howTo).toBeGreaterThanOrEqual(0);
    expect(howTo).toBeLessThan(expectNothing);
  });

  it('states all four properties, since a feature defined by refusal is invisible', () => {
    const note = text(new GracePanel().root.querySelector('.grace-note') as Element);
    for (const property of ['Uncallable', 'Unconfigurable', 'Unearnable']) {
      expect(note).toContain(property);
    }
    expect(note).toContain('0.2');
  });
});
