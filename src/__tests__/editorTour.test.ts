import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { STEPS, Tour, type Store } from '../editor/Tour';

/**
 * A tour that points at nothing.
 *
 * The steps are prose hung on selectors, and a selector is the part that rots:
 * rename a zone and every one of these goes on running, highlighting nothing,
 * saying something true about a thing the reader cannot see. So the editor's own
 * source is read here and each anchor checked against it, which turns a silent
 * failure into a red suite.
 */

const editorSource = ['main.ts', 'console.ts', 'editor.css']
  .map((f) => readFileSync(join(__dirname, '..', 'editor', f), 'utf8'))
  .join('\n');

/** A fake Storage, since the point of the offer is that it happens once. */
function shelf(seeded: Record<string, string> = {}): Store {
  const held = { ...seeded };
  return {
    getItem: (k) => held[k] ?? null,
    setItem: (k, v) => {
      held[k] = v;
    },
  };
}

describe('every step points at something that is there', () => {
  it('names a selector the editor actually builds', () => {
    for (const step of STEPS) {
      for (const token of step.anchor.split(/[#.]/).filter(Boolean)) {
        expect(editorSource.includes(token), `${step.title} anchors "${step.anchor}"`).toBe(true);
      }
    }
  });

  it('says something worth reading at each one', () => {
    for (const step of STEPS) {
      expect(step.title.length, step.anchor).toBeGreaterThan(3);
      expect(step.says.length, step.anchor).toBeGreaterThan(40);
    }
  });

  it('stays short enough that somebody finishes it', () => {
    expect(STEPS.length).toBeLessThanOrEqual(8);
    expect(STEPS.length).toBeGreaterThan(4);
  });

  it('covers the two halves a reader cannot otherwise tell apart', () => {
    const anchors = STEPS.map((s) => s.anchor);
    // what the player does, and what the world merely is
    expect(anchors).toContain('.flag.verb');
    expect(anchors).toContain('.cue');
  });
});

describe('walking it', () => {
  it('is not running until it is started', () => {
    const tour = new Tour(shelf());
    expect(tour.running).toBe(false);
    expect(tour.step).toBeNull();
    expect(tour.next()).toBeNull();
  });

  it('opens on the first step and counts from one', () => {
    const tour = new Tour(shelf());
    expect(tour.start()?.anchor).toBe(STEPS[0]?.anchor);
    expect(tour.position).toBe(1);
    expect(tour.length).toBe(STEPS.length);
  });

  it('walks forward, and stops itself at the end rather than sticking', () => {
    const tour = new Tour(shelf());
    tour.start();
    for (let i = 1; i < STEPS.length; i += 1) expect(tour.next()).not.toBeNull();
    expect(tour.next()).toBeNull();
    expect(tour.running).toBe(false);
  });

  it('goes back without falling off the front', () => {
    const tour = new Tour(shelf());
    tour.start();
    tour.next();
    expect(tour.back()?.anchor).toBe(STEPS[0]?.anchor);
    expect(tour.back()?.anchor).toBe(STEPS[0]?.anchor);
    expect(tour.position).toBe(1);
  });
});

describe('offering it', () => {
  it('offers on a first visit', () => {
    expect(new Tour(shelf()).worthOffering).toBe(true);
  });

  it('does not ask a second time, whichever way the answer went', () => {
    const store = shelf();
    const taken = new Tour(store);
    taken.start();
    expect(new Tour(store).worthOffering).toBe(false);

    const refused = shelf();
    new Tour(refused).settle();
    expect(new Tour(refused).worthOffering).toBe(false);
  });

  it('still offers where there is nowhere to remember it', () => {
    expect(new Tour(null).worthOffering).toBe(true);
  });

  it('can always be replayed on purpose, offered or not', () => {
    const store = shelf({ 'providence.toured.v1': '1' });
    const tour = new Tour(store);
    expect(tour.worthOffering).toBe(false);
    expect(tour.start()).not.toBeNull();
    expect(tour.running).toBe(true);
  });
});
