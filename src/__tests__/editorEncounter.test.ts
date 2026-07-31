import { describe, expect, it } from 'vitest';

import { BREAK_METRES, Encounter, PREPARE_METRES, REACH_METRES } from '../editor/Encounter';

/**
 * The conversation, as a state machine and nothing else.
 *
 * It is here rather than in main.ts for the reason Bearing is: the rules about
 * when a man is close enough to talk to, and what ends the talking, are the part
 * that can be wrong, and a rule buried in a frame loop cannot be asserted.
 *
 * The one that matters most is the last group. A menu that stays open while the
 * character walks off is a menu that lets you ask a question of somebody who is
 * no longer there — which is precisely the fiction this project exists to
 * refuse. The world does not wait for the player.
 */

const at = (metres: number, moved = false) => ({ metres, moved });

describe('coming within speaking distance', () => {
  it('starts with nobody in reach', () => {
    expect(new Encounter().state).toBe('away');
  });

  it('offers to talk only once you are actually close', () => {
    const meeting = new Encounter();
    expect(meeting.observe(at(REACH_METRES + 0.5)).state).toBe('away');
    expect(meeting.observe(at(REACH_METRES - 0.5)).state).toBe('near');
  });

  it('does not flicker on and off while you stand at the edge', () => {
    const meeting = new Encounter();
    meeting.observe(at(REACH_METRES - 0.1));
    // drifting back past the reach must not immediately withdraw the offer
    expect(meeting.observe(at(REACH_METRES + 0.2)).state).toBe('near');
    expect(meeting.observe(at(REACH_METRES + 1)).state).toBe('away');
  });
});

describe('opening it', () => {
  it('cannot be opened from across the field', () => {
    const meeting = new Encounter();
    meeting.observe(at(9));
    expect(meeting.hail()).toBe(false);
    expect(meeting.state).toBe('away');
  });

  it('opens when you are near and hail him', () => {
    const meeting = new Encounter();
    meeting.observe(at(2));
    expect(meeting.hail()).toBe(true);
    expect(meeting.state).toBe('open');
  });

  it('cannot be opened twice over', () => {
    const meeting = new Encounter();
    meeting.observe(at(2));
    meeting.hail();
    expect(meeting.hail()).toBe(false);
  });

  it('closes on your own account, leaving him standing there', () => {
    const meeting = new Encounter();
    meeting.observe(at(2));
    meeting.hail();
    expect(meeting.dismiss()).toBe(true);
    expect(meeting.state).toBe('near');
    expect(meeting.dismiss()).toBe(false);
  });
});

describe('what ends it without you', () => {
  const opened = () => {
    const meeting = new Encounter();
    meeting.observe(at(2));
    meeting.hail();
    return meeting;
  };

  it('ends the moment his arc moves, because a soul does not hold still for a menu', () => {
    const meeting = opened();
    const beat = meeting.observe(at(2, true));
    expect(beat.ended).toBe('he-moved');
    expect(beat.state).toBe('near');
  });

  it('ends when he has put the field between you', () => {
    const meeting = opened();
    const beat = meeting.observe(at(BREAK_METRES + 1));
    expect(beat.ended).toBe('walked-off');
    expect(beat.state).toBe('away');
  });

  it('survives him moving a step away, since only leaving ends it', () => {
    const meeting = opened();
    const beat = meeting.observe(at(BREAK_METRES - 1));
    expect(beat.ended).toBeNull();
    expect(beat.state).toBe('open');
  });

  it('reports the ending once and not on every tick afterwards', () => {
    const meeting = opened();
    expect(meeting.observe(at(2, true)).ended).toBe('he-moved');
    expect(meeting.observe(at(2, true)).ended).toBeNull();
  });
});

describe('when a different character is loaded', () => {
  it('does not leave you talking to the man who left', () => {
    const meeting = new Encounter();
    meeting.observe(at(2));
    meeting.hail();

    meeting.forget();
    expect(meeting.state).toBe('away');
    // the newcomer stands a few metres off, which would have kept it open
    expect(meeting.observe(at(5)).state).toBe('away');
  });

  it('buys the newcomer his own opening line', () => {
    const meeting = new Encounter();
    meeting.observe(at(PREPARE_METRES - 1));
    meeting.forget();
    expect(meeting.observe(at(PREPARE_METRES - 1)).prepare).toBe(true);
  });
});

describe('getting his first line ready before it is wanted', () => {
  it('asks once, on the way in, while there is still ground to cross', () => {
    const meeting = new Encounter();
    expect(meeting.observe(at(PREPARE_METRES + 3)).prepare).toBe(false);
    expect(meeting.observe(at(PREPARE_METRES - 0.5)).prepare).toBe(true);
    // the rest of the approach must not buy a second line
    expect(meeting.observe(at(4)).prepare).toBe(false);
    expect(meeting.observe(at(2)).prepare).toBe(false);
  });

  it('asks again for a fresh approach, but not for a shuffle at the edge', () => {
    const meeting = new Encounter();
    meeting.observe(at(PREPARE_METRES - 1));
    expect(meeting.observe(at(PREPARE_METRES + 0.5)).prepare).toBe(false);
    expect(meeting.observe(at(PREPARE_METRES - 0.5)).prepare).toBe(false);

    meeting.observe(at(14));
    expect(meeting.observe(at(PREPARE_METRES - 0.5)).prepare).toBe(true);
  });

  it('does not buy a line merely because an arc was loaded', () => {
    /* A newly loaded character is placed about 5.3 m off. Counting that as an
       approach would spend a generated line on every click down the library,
       for twenty four people nobody walked up to. */
    expect(new Encounter().observe(at(5.3)).prepare).toBe(false);
  });

  it('is ready well before he is close enough to be spoken to', () => {
    // the measured Gloo round trip is 3.5 to 4.7 s, and the walk covers it
    expect(PREPARE_METRES).toBeGreaterThan(REACH_METRES * 1.5);
  });
});
