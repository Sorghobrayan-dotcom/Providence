import { describe, expect, it } from 'vitest';
import { Grace, desperationFrom } from '../providence/grace';

/**
 * Every claim docs/grace.md makes, asserted. If one of these breaks, the
 * document is no longer describing the code and one of the two is lying.
 */

/** A coin we control, so the distribution can be examined rather than trusted. */
function coin(sequence: readonly number[]): () => number {
  let i = 0;
  return () => sequence[i++ % sequence.length] as number;
}

/** Push desperation up, wait out the refractory period, repeat. */
function episodes(grace: Grace, count: number): { given: number; withheld: number } {
  let given = 0;
  let withheld = 0;
  for (let n = 0; n < count; n++) {
    const report = grace.observe(0.95, 1);
    if (report.outcome === 'given') given += 1;
    if (report.outcome === 'withheld') withheld += 1;
    grace.observe(0.1, 1); // the danger passes, closing the episode
    grace.observe(0.1, 120); // and the refractory period elapses
  }
  return { given, withheld };
}

describe('desperation', () => {
  it('is one minus the best chance on offer', () => {
    expect(desperationFrom([0.4, 0.1])).toBeCloseTo(0.6);
    expect(desperationFrom([0])).toBe(1);
    expect(desperationFrom([])).toBe(1); // no options at all
  });
});

describe('it does not look at a player who is merely losing', () => {
  it('stays silent below the threshold, however long the player stands there', () => {
    const grace = new Grace(coin([0]));  // a coin that always gives
    for (let t = 0; t < 500; t++) {
      expect(grace.observe(0.8, 1).outcome).toBe('none');
    }
    expect(grace.episodesSeen).toBe(0);
  });
});

describe('one draw per episode, never per tick', () => {
  it('does not draw again by standing in the same hopeless moment', () => {
    const grace = new Grace(coin([0.9])); // a coin that always withholds
    expect(grace.observe(0.95, 1).outcome).toBe('withheld');
    for (let t = 0; t < 300; t++) {
      expect(grace.observe(0.95, 1).outcome).toBe('watching');
    }
    expect(grace.episodesSeen).toBe(1); // three hundred seconds, one draw
  });

  it('will not open a second episode until the refractory period has passed', () => {
    const grace = new Grace(coin([0.9]));
    grace.observe(0.95, 1);
    grace.observe(0.1, 1); // episode closes

    grace.observe(0.95, 1); // straight back into danger
    expect(grace.observe(0.95, 1).outcome).toBe('watching');
    expect(grace.episodesSeen).toBe(1);

    grace.observe(0.1, 120); // wait it out
    expect(grace.observe(0.95, 1).outcome).toBe('withheld');
    expect(grace.episodesSeen).toBe(2);
  });
});

describe('most desperate moments receive nothing', () => {
  it('lands near one in five over ten thousand episodes', () => {
    let seed = 12345;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const grace = new Grace(rng);
    episodes(grace, 10_000);

    expect(grace.episodesSeen).toBe(10_000);
    expect(grace.rate).toBeGreaterThan(0.17);
    expect(grace.rate).toBeLessThan(0.23);
  });
});

describe('the rate does not move with anything the player did', () => {
  it('treats two populations that differ only in merit identically', () => {
    const make = (offset: number) => {
      let seed = 777 + offset;
      return () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
    };

    /* The saint and the monster are handed to the same method, which is given
       no way to tell them apart: observe() takes desperation and a duration,
       and nothing else. Matthew 5:45 as a signature. */
    const saint = new Grace(make(0));
    const monster = new Grace(make(101));
    episodes(saint, 4000);
    episodes(monster, 4000);

    expect(Math.abs(saint.rate - monster.rate)).toBeLessThan(0.03);
  });
});

describe('when it fires, it opens a door rather than undoing the loss', () => {
  it('reports an opening and the passage behind it', () => {
    const grace = new Grace(coin([0]));
    const report = grace.observe(0.95, 1);
    expect(report.outcome).toBe('given');
    expect(report.opening).toBeTruthy();
    expect(report.because).toBe('EPH.2.8');
  });

  it('stores no verse text, only the reference', () => {
    const grace = new Grace(coin([0]));
    const report = grace.observe(0.95, 1);
    expect(report.because).toMatch(/^[A-Z0-9]{3}\.\d+(\.\d+)?$/);
    expect(JSON.stringify(report)).not.toMatch(/grace|saved|faith/i);
  });
});

describe('there is no way to ask for it, and no way to tune it', () => {
  it('exposes no method that triggers grace', () => {
    const grace = new Grace();
    const surface = [
      ...Object.getOwnPropertyNames(Object.getPrototypeOf(grace)),
      ...Object.keys(grace),
    ];
    for (const name of surface) {
      expect(name).not.toMatch(/trigger|force|grant|give|invoke|request/i);
    }
  });

  it('takes no threshold, rate or difficulty argument', () => {
    // one optional parameter, the coin, and nothing else
    expect(Grace.length).toBe(0);
    const source = Grace.prototype.observe.toString();
    expect(source).not.toMatch(/options|config|difficulty|tier|premium/i);
  });
});
