import { describe, expect, it } from 'vitest';

import { CONTROLS, FLAGS, KEYS, PANELS, markControls, namesAControl } from '../editor/Controls';
import { LIBRARY } from '../providence/arcs';
import { cueFor } from '../editor/Cues';
import { blankWorld } from '../providence/Actor';

/**
 * One list, and the two rumours it used to have.
 *
 * The toolbar built its toggles from one list, the cue check read a second, and
 * the routine that emphasises a named control carried a third — eleven labels
 * typed into a regular expression by hand. Rename a toggle and only the toolbar
 * followed: the cues went on naming something that no longer existed, the check
 * that exists to catch precisely that went on passing because it was reading the
 * stale copy, and the emphasis quietly stopped. Nothing went red. The tool just
 * started lying to the person holding it.
 *
 * These are the assertions that make the three agree, and `Soul` is the proof
 * they did not: it was in the cue vocabulary and missing from the markup, so a
 * cue sending a reader to the Soul tab never highlighted it, for as long as that
 * cue has existed.
 */

describe('the toolbar and the cue vocabulary are the same list', () => {
  it('lets a cue name every toggle the toolbar actually shows', () => {
    for (const flag of FLAGS) {
      expect(CONTROLS, `the toolbar shows "${flag.label}" and no cue may name it`).toContain(flag.label);
      expect(namesAControl(`Toggle ${flag.label}.`), flag.label).toBe(true);
    }
  });

  it('points every toggle at a field the world actually has', () => {
    const world = blankWorld() as unknown as Record<string, unknown>;
    for (const flag of FLAGS) {
      expect(Object.hasOwn(world, flag.key), `${flag.key} is not on the world`).toBe(true);
    }
  });

  it('names all four tabs, including the one the markup used to forget', () => {
    expect(PANELS).toEqual(['Soul', 'Relations', 'Place', 'Grace']);
    for (const panel of PANELS) expect(CONTROLS).toContain(panel);
  });
});

describe('marking up what a cue names', () => {
  it('caps every key, including the one that opens a conversation', () => {
    for (const key of KEYS) {
      expect(markControls(`Press ${key} twice.`)).toContain(`<kbd>${key}</kbd>`);
    }
  });

  it('emphasises every toggle and every tab', () => {
    for (const name of [...FLAGS.map((f) => f.label), ...PANELS]) {
      expect(markControls(`Toggle ${name} on.`), name).toContain(`<b>${name}</b>`);
    }
  });

  it('does not let one label eat another that contains it', () => {
    // "under threat" and "under pressure" share a word; longest-first settles it
    const marked = markControls('Toggle under pressure, not under threat.');
    expect(marked).toContain('<b>under pressure</b>');
    expect(marked).toContain('<b>under threat</b>');
  });

  it('leaves the plain words plain, so nothing promises a button', () => {
    const marked = markControls('Nothing to press. Wait, and walk.');
    expect(marked).not.toContain('<b>');
    expect(marked).not.toContain('<kbd>');
  });

  it('escapes the text before it adds any markup of its own', () => {
    const marked = markControls('Press S if <b>fear</b> & doubt rise.');
    expect(marked).toContain('&lt;b&gt;fear&lt;/b&gt;');
    expect(marked).toContain('&amp;');
    // the only real tag in the result is the one this function put there
    expect(marked.match(/<(?!kbd|\/kbd)/g)).toBeNull();
  });

  it('does not cap a lowercase s wherever it appears in a sentence', () => {
    expect(markControls('he stands still and says nothing')).not.toContain('<kbd>');
  });
});

describe('what the cues actually say gets marked', () => {
  it('emphasises something in every cue that names a control', () => {
    for (const arc of LIBRARY) {
      for (const node of arc.nodes) {
        const cue = cueFor(arc.id, node.id, node.directive);
        if (!namesAControl(cue.next)) continue;

        const marked = markControls(cue.next);
        const plainOnly = /\b(drag|walk|wait|nothing)\b/i.test(cue.next)
          && !/\b(S|K|E)\b/.test(cue.next)
          && ![...FLAGS.map((f) => f.label), ...PANELS].some((n) => cue.next.includes(n));

        if (plainOnly) continue;
        expect(marked, `${arc.id}.${node.id}: "${cue.next}"`).toMatch(/<kbd>|<b>/);
      }
    }
  });
});
