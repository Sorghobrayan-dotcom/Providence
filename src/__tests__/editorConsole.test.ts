// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScriptureConsole } from '../editor/console';
import { AT_REST, atRest, knock, stepSwing } from '../editor/logo';
import type { Line } from '../providence/Scripture';

/**
 * The editor had no tests, which the review named as its worst exposure: it is
 * the first thing a judge opens and the only part without a net. These cover the
 * two pieces with real logic — what the console keeps and what the mark does —
 * rather than asserting that markup exists.
 */

const VERSE: Line = {
  reference: 'JON.1.3',
  text: 'But Jonah rose up to flee unto Tarshish from the presence of the LORD.',
  source: 'pack',
  language: 'eng',
};

describe('the plumb line swings', () => {
  it('hangs dead vertical when nothing has happened', () => {
    expect(atRest(AT_REST)).toBe(true);
    expect(stepSwing(AT_REST, 1).angle).toBe(0);
  });

  it('comes back to true after a knock, and does so inside three seconds', () => {
    let swing = knock(AT_REST, 1);
    expect(Math.abs(swing.velocity)).toBeGreaterThan(0);

    let frames = 0;
    while (frames < 600 && !atRest(swing)) {
      swing = stepSwing(swing, 1 / 60);
      frames += 1;
    }

    expect(atRest(swing)).toBe(true);
    // the settle has to be over before a reader wonders whether it is broken;
    // this pins the claim the damping constant is making
    expect(frames / 60).toBeLessThan(3);
  });

  it('loses energy every swing rather than running forever', () => {
    let swing = knock(AT_REST, 1);
    const start = Math.abs(swing.velocity);
    for (let i = 0; i < 30; i += 1) swing = stepSwing(swing, 1 / 60);
    expect(Math.abs(swing.velocity)).toBeLessThan(start);
  });

  it('saturates instead of escalating under a storm of events', () => {
    let swing = AT_REST;
    for (let i = 0; i < 200; i += 1) {
      swing = knock(swing, 1);
      swing = stepSwing(swing, 1 / 60);
    }
    // a plumb line that spins is no longer a plumb line
    expect(Math.abs(swing.angle)).toBeLessThanOrEqual(0.34);
  });

  it('does not teleport when a backgrounded tab wakes up owing seconds', () => {
    const swing = stepSwing(knock(AT_REST, 1), 30);
    expect(Number.isFinite(swing.angle)).toBe(true);
    expect(Math.abs(swing.angle)).toBeLessThanOrEqual(0.34);
  });

  it('decays identically at 60Hz and at 144Hz', () => {
    let slow = knock(AT_REST, 1);
    let fast = knock(AT_REST, 1);
    for (let i = 0; i < 60; i += 1) slow = stepSwing(slow, 1 / 60);
    for (let i = 0; i < 144; i += 1) fast = stepSwing(fast, 1 / 144);
    expect(slow.angle).toBeCloseTo(fast.angle, 3);
  });
});

describe('the console', () => {
  let log: ScriptureConsole;

  beforeEach(() => {
    log = new ScriptureConsole();
    document.body.replaceChildren(log.root);
  });

  const lines = () => log.root.querySelectorAll('.line');

  it('keeps every control it has always had', () => {
    log.write('arc', 'jonah', 'fled', 'JON.1.3').verse(VERSE);

    expect(log.root.querySelectorAll('.chip')).toHaveLength(4);
    expect(log.root.querySelector('.search input')).not.toBeNull();
    expect(log.root.querySelector('[data-act="clear"]')).not.toBeNull();
    expect(log.root.querySelector('.pin')).not.toBeNull();
    expect(log.root.querySelector('.verse .ghost')?.textContent).toBe('Copy');
  });

  it('puts the newest line at the top', () => {
    log.write('arc', 'jonah', 'fled', 'JON.1.3');
    log.write('grace', 'nineveh', 'spared', 'JON.3.10');
    expect(lines()[0]?.querySelector('.who')?.textContent).toBe('nineveh');
  });

  it('numbers lines in the order they happened, not the order they are shown', () => {
    log.write('arc', 'jonah', 'fled', 'JON.1.3');
    log.write('arc', 'jonah', 'prayed', 'JON.2.1');
    expect(lines()[0]?.querySelector('.seq')?.textContent).toBe('002');
    expect(lines()[1]?.querySelector('.seq')?.textContent).toBe('001');
  });

  it('sets text as text, so a verse containing markup cannot become markup', () => {
    log.write('arc', '<img src=x onerror=alert(1)>', 'fled', 'JON.1.3');
    expect(log.root.querySelector('img')).toBeNull();
    expect(lines()[0]?.querySelector('.who')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('drops the oldest lines past the cap', () => {
    for (let i = 0; i < 130; i += 1) log.write('arc', 'jonah', `step ${i}`, 'JON.1.3');
    expect(lines()).toHaveLength(120);
    // the survivors are the newest ones
    expect(lines()[0]?.querySelector('.seq')?.textContent).toBe('130');
  });

  describe('the filters', () => {
    const chip = (label: string) =>
      [...log.root.querySelectorAll<HTMLButtonElement>('.chip')]
        .find((c) => c.querySelector('.chip-label')?.textContent === label) as HTMLButtonElement;

    it('carries each channel count, and stops counting what the cap dropped', () => {
      log.write('arc', 'jonah', 'fled', 'JON.1.3');
      log.write('arc', 'jonah', 'prayed', 'JON.2.1');
      log.write('grace', 'nineveh', 'spared', 'JON.3.10');

      const n = (label: string) => chip(label).querySelector('.chip-n')?.textContent;
      expect(n('All')).toBe('3');
      expect(n('Souls')).toBe('2');
      expect(n('Grace')).toBe('1');

      for (let i = 0; i < 130; i += 1) log.write('editor', 'editor', `step ${i}`, 'JON.1.3');
      expect(n('Souls')).toBe('0');
      expect(n('Grace')).toBe('0');
      expect(n('All')).toBe('120');
    });

    it('shows one channel at a time and comes back on All', () => {
      log.write('arc', 'jonah', 'fled', 'JON.1.3');
      log.write('grace', 'nineveh', 'spared', 'JON.3.10');

      chip('Souls').click();
      expect(chip('Souls').getAttribute('aria-pressed')).toBe('true');
      expect([...lines()].filter((l) => !(l as HTMLElement).hidden)).toHaveLength(1);

      chip('All').click();
      expect([...lines()].filter((l) => !(l as HTMLElement).hidden)).toHaveLength(2);
    });

    it('reports how much of the log a filter is holding back', () => {
      log.write('arc', 'jonah', 'fled', 'JON.1.3');
      log.write('grace', 'nineveh', 'spared', 'JON.3.10');

      expect(log.root.querySelector('.console-count')?.textContent).toBe('2');
      chip('Souls').click();
      expect(log.root.querySelector('.console-count')?.textContent).toBe('1 of 2');
    });
  });

  describe('clearing', () => {
    it('keeps the pinned lines and drops the rest', () => {
      log.write('arc', 'jonah', 'fled', 'JON.1.3');
      log.write('arc', 'jonah', 'prayed', 'JON.2.1');

      (lines()[0]?.querySelector('.pin') as HTMLButtonElement).click();
      (log.root.querySelector('[data-act="clear"]') as HTMLButtonElement).click();

      expect(log.root.querySelectorAll('.line')).toHaveLength(1);
      expect(log.root.querySelector('.pinned')?.hasAttribute('hidden')).toBe(false);
    });

    it('forgets the verses it dropped, so the count does not drift', () => {
      log.write('arc', 'jonah', 'fled', 'JON.1.3').verse(VERSE);
      (log.root.querySelector('[data-act="clear"]') as HTMLButtonElement).click();

      log.write('arc', 'jonah', 'prayed', 'JON.2.1').verse(VERSE);
      expect(log.root.querySelector('.console-count')?.textContent).toBe('1 · 1 spoken');
    });
  });

  describe('the pointer lens', () => {
    /* jsdom has no layout, so the geometry is supplied: a 200px tall stream
       holding 40px rows. That is the only fiction here — the arithmetic under
       test is the real one. */
    const layOut = (): HTMLElement[] => {
      const stream = log.root.querySelector('.stream') as HTMLElement;
      stream.getBoundingClientRect = () => ({ top: 0, bottom: 200, height: 200 }) as DOMRect;

      const rows = [...log.root.querySelectorAll<HTMLElement>('.line')];
      rows.forEach((row, i) => {
        const top = i * 40;
        row.getBoundingClientRect = () => ({ top, bottom: top + 40, height: 40 }) as DOMRect;
      });
      return rows;
    };

    const near = (rows: HTMLElement[]) => rows.map((r) => Number(r.style.getPropertyValue('--near')));

    let frames: FrameRequestCallback[] = [];

    beforeEach(() => {
      frames = [];
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        frames.push(cb);
        return frames.length;
      });
    });

    afterEach(() => vi.unstubAllGlobals());

    const flush = () => {
      const pending = frames;
      frames = [];
      for (const cb of pending) cb(0);
    };

    const point = (clientY: number) => {
      const stream = log.root.querySelector('.stream') as HTMLElement;
      stream.dispatchEvent(new MouseEvent('pointermove', { clientY }));
      flush();
    };

    it('falls off with distance from the pointer and bottoms out beyond its reach', () => {
      for (let i = 0; i < 5; i += 1) log.write('arc', 'jonah', `step ${i}`, 'JON.1.3');
      const rows = layOut();

      point(20); // the centre of the top row

      const values = near(rows);
      expect(values[0]).toBe(1);
      // 40px away out of a 132px reach
      expect(values[1]).toBeCloseTo(1 - 40 / 132, 2);
      expect(values[2]).toBeCloseTo(1 - 80 / 132, 2);
      // 160px away is past the reach entirely, and never goes negative
      expect(values[4]).toBe(0);
    });

    it('spends nothing on rows scrolled out of the stream', () => {
      for (let i = 0; i < 5; i += 1) log.write('arc', 'jonah', `step ${i}`, 'JON.1.3');
      const rows = layOut();
      rows[3]!.getBoundingClientRect = () => ({ top: 400, bottom: 440, height: 40 }) as DOMRect;

      point(20);
      expect(near(rows)[3]).toBe(0);
    });

    it('coalesces a burst of pointer moves into one frame', () => {
      log.write('arc', 'jonah', 'fled', 'JON.1.3');
      layOut();
      const stream = log.root.querySelector('.stream') as HTMLElement;

      for (let i = 0; i < 20; i += 1) {
        stream.dispatchEvent(new MouseEvent('pointermove', { clientY: 20 + i }));
      }
      expect(frames).toHaveLength(1);
    });

    it('returns the whole log to full strength when the pointer leaves', () => {
      for (let i = 0; i < 5; i += 1) log.write('arc', 'jonah', `step ${i}`, 'JON.1.3');
      const rows = layOut();
      const stream = log.root.querySelector('.stream') as HTMLElement;

      point(20);
      expect(near(rows)[4]).toBe(0);

      stream.dispatchEvent(new MouseEvent('pointerleave'));
      flush();
      expect(near(rows)).toEqual([1, 1, 1, 1, 1]);
    });
  });

  describe('Scripture under a line', () => {
    it('sets the verse in its own element, with the reference and the source', () => {
      log.write('arc', 'jonah', 'fled', 'JON.1.3').verse(VERSE);

      const quote = log.root.querySelector('.verse');
      expect(quote?.querySelector('p')?.textContent).toBe(VERSE.text);
      expect(quote?.querySelector('cite')?.textContent).toBe('JON.1.3');
      expect(quote?.querySelector('.src')?.textContent).toBe('offline pack');
    });

    it('says a line was refused rather than inventing one', () => {
      log.write('arc', 'jonah', 'fled', 'JON.1.3').verse(null);

      expect(log.root.querySelector('.verse')).toBeNull();
      const silence = log.root.querySelector('.silence')?.textContent ?? '';
      expect(silence).toContain('JON.1.3');
      expect(silence).toContain('rather than something invented');
    });

    it('counts what was spoken separately from what was logged', () => {
      log.write('arc', 'jonah', 'fled', 'JON.1.3').verse(VERSE);
      log.write('arc', 'jonah', 'sulked', 'JON.4.1').verse(null);

      // a refusal is logged but never counted as something the character said
      expect(log.root.querySelector('.console-count')?.textContent).toBe('2 · 1 spoken');
    });
  });
});
