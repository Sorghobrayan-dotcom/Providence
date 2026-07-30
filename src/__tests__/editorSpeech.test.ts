// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';

import { Speech } from '../editor/Speech';

/**
 * The bark above the character's head.
 *
 * jsdom has no 2D context, so one is supplied. Text metrics are the only thing
 * the class asks it for, and a proportional-width stand-in is enough to exercise
 * the wrapping — the arithmetic under test is the real one, and it is the part
 * that can silently eat the end of a verse.
 */

const drawn: { text: string; font: string }[] = [];

beforeAll(() => {
  // 19px per character at the body size, which is about right for the serif
  const widthOf = (s: string, font: string) => s.length * (font.includes('38px') ? 19 : 11);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HTMLCanvasElement.prototype as any).getContext = function fake() {
    let font = '';
    return {
      get font() { return font; },
      set font(next: string) { font = next; },
      measureText: (s: string) => ({ width: widthOf(s, font) }),
      fillText: (s: string) => drawn.push({ text: s, font }),
      clearRect: () => {}, beginPath: () => {}, roundRect: () => {}, fill: () => {},
      stroke: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
      fillStyle: '', strokeStyle: '', lineWidth: 0, textAlign: '', textBaseline: '',
    };
  };
});

const body = () => drawn.filter((d) => d.font.includes('38px')).map((d) => d.text);
const cite = () => drawn.filter((d) => d.font.includes('20px')).map((d) => d.text);

describe('the character speaks', () => {
  let speech: Speech;

  const say = (text: string, reference = 'JON.1.3') => {
    drawn.length = 0;
    speech = new Speech();
    speech.say(text, reference);
  };

  it('says nothing until it is given something to say', () => {
    const fresh = new Speech();
    expect(fresh.isSpeaking).toBe(false);
    expect(fresh.sprite.visible).toBe(false);
  });

  it('shows the verse and its reference, and nothing else', () => {
    say('But Jonah rose up to flee unto Tarshish.', 'JON.1.3');
    expect(body().join(' ')).toBe('But Jonah rose up to flee unto Tarshish.');
    expect(cite()).toEqual(['JON.1.3']);
    expect(speech.sprite.visible).toBe(true);
  });

  it('wraps a long verse instead of running it off the plate', () => {
    say('Now the word of the LORD came unto Jonah the son of Amittai saying arise go to Nineveh that great city and cry against it');
    const written = body();
    expect(written.length).toBeGreaterThan(1);
    expect(written.length).toBeLessThanOrEqual(4);
  });

  it('marks a passage it had to trim, rather than ending mid-word in silence', () => {
    const long = 'and '.repeat(120).trim();
    say(long);
    expect(body()).toHaveLength(4);
    expect(body()[3]?.endsWith('…')).toBe(true);
  });

  it('does not mark a verse that fitted', () => {
    say('Arise, go to Nineveh.');
    expect(body().some((l) => l.includes('…'))).toBe(false);
  });

  describe('how long it stays up', () => {
    it('holds a short line long enough to read, then fades and goes', () => {
      say('Arise, go to Nineveh.');
      speech.update(2.0);
      expect(speech.isSpeaking).toBe(true);
      expect(speech.sprite.material.opacity).toBe(1);

      // 'Arise, go to Nineveh.' earns the 2.6s floor, so this lands 0.3s into
      // the 0.55s fade rather than stepping clean over it
      speech.update(0.9);
      expect(speech.sprite.material.opacity).toBeCloseTo(1 - 0.3 / 0.55, 2);

      speech.update(1.0);
      expect(speech.isSpeaking).toBe(false);
      expect(speech.sprite.visible).toBe(false);
    });

    it('fades in rather than snapping on', () => {
      say('Arise, go to Nineveh.');
      speech.update(0.05);
      expect(speech.sprite.material.opacity).toBeGreaterThan(0);
      expect(speech.sprite.material.opacity).toBeLessThan(1);
    });

    it('gives a long verse more time than a short one', () => {
      say('Arise.');
      const short = speech;
      short.update(4);
      const shortGone = !short.isSpeaking;

      say('Now the word of the LORD came unto Jonah the son of Amittai, saying, Arise, go to Nineveh, that great city, and cry against it.');
      speech.update(4);

      expect(shortGone).toBe(true);
      expect(speech.isSpeaking).toBe(true);
    });

    it('caps the dwell so a long passage cannot park over the world', () => {
      say('word '.repeat(400).trim());
      speech.update(9.9);
      expect(speech.isSpeaking).toBe(false);
    });
  });

  it('goes quiet at once when the editor swaps character', () => {
    say('Arise, go to Nineveh.');
    speech.hush();
    expect(speech.isSpeaking).toBe(false);
    expect(speech.sprite.visible).toBe(false);
    expect(speech.sprite.material.opacity).toBe(0);
  });

  it('interrupts itself rather than stacking plates', () => {
    say('Arise, go to Nineveh.');
    speech.update(2.4);
    speech.say('But Jonah rose up to flee.', 'JON.1.3');
    speech.update(0.01);
    // the new line starts its own fade in, it does not inherit the old age
    expect(speech.sprite.material.opacity).toBeLessThan(0.2);
    expect(speech.isSpeaking).toBe(true);
  });

  it('draws over the body that said it, so a line is never half-occluded', () => {
    const fresh = new Speech();
    expect(fresh.sprite.material.depthTest).toBe(false);
    expect(fresh.sprite.renderOrder).toBeGreaterThan(0);
    // anchored at the bottom edge, so the plate sits on the head not through it
    expect(fresh.sprite.center.y).toBe(0);
  });
});
