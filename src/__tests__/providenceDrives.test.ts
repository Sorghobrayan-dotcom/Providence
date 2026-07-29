import { describe, expect, it } from 'vitest';
import { Actor, blankWorld } from '../providence/Actor';
import { MARTHA_ARC, MARY_ARC, ELIJAH_ARC } from '../providence/motivated';
import { appraise, CALM, ELIJAH, MARTHA, MARY, type Situation } from '../providence/drives';
import type { WorldView } from '../providence/types';

/**
 * The claim: two characters, one room, identical inputs, opposite behaviour,
 * and nothing in either arc names the other. The difference is entirely in what
 * each of them wants.
 */

const room = (situation: Partial<Situation>, over: Partial<Omit<WorldView, 'timeInNode'>> = {}) => ({
  ...blankWorld(),
  distanceToPlayer: 3,
  ...over,
  situation: { ...CALM, ...situation },
});

function settle(actor: Actor, seconds: number, world: ReturnType<typeof room>): void {
  for (let t = 0; t < seconds; t++) actor.update(1, world);
}

describe('the same room, read two ways', () => {
  it('sends one to the mess and keeps the other where she is', () => {
    const marthe = new Actor(MARTHA_ARC);
    const marie = new Actor(MARY_ARC);

    // something is knocked over, and at the same moment something worth
    // hearing is being said. Both women see both facts.
    const world = room({ disorder: 0.6, worthHearing: 0.8 });
    settle(marthe, 3, world);
    settle(marie, 3, world);

    expect(marthe.state).toBe('tidying');
    expect(marie.state).toBe('listening');
  });

  it('pulls Martha back out of the room the moment anything slips', () => {
    const marthe = new Actor(MARTHA_ARC);
    settle(marthe, 3, room({ worthHearing: 0.9 }));
    expect(marthe.state).toBe('listening');

    settle(marthe, 3, room({ worthHearing: 0.9, disorder: 0.3 }));
    expect(marthe.state).toBe('tidying'); // she could not hold her seat
  });

  it('does not move Mary for the same slip', () => {
    const marie = new Actor(MARY_ARC);
    settle(marie, 3, room({ worthHearing: 0.9 }));
    settle(marie, 20, room({ worthHearing: 0.9, disorder: 0.3 }));
    expect(marie.state).toBe('listening');
  });

  it('moves even Mary if the disorder is severe enough', () => {
    const marie = new Actor(MARY_ARC);
    settle(marie, 3, room({ worthHearing: 0.9 }));
    settle(marie, 5, room({ worthHearing: 0.9, disorder: 0.95 }));
    expect(marie.state).toBe('tidying');
  });
});

describe('Martha breaks, and is not put back the way she broke', () => {
  it('stops the work to complain once the strain does not let up', () => {
    const marthe = new Actor(MARTHA_ARC);
    settle(marthe, 3, room({ disorder: 0.6 }));
    settle(marthe, 6, room({ disorder: 0.6, strain: 0.8 }));
    expect(marthe.state).toBe('complaining');
    expect(marthe.directive.refusing).toBe(true);
  });

  it('is not settled by tidier surroundings, only by being told what matters', () => {
    const marthe = new Actor(MARTHA_ARC);
    settle(marthe, 3, room({ disorder: 0.6 }));
    settle(marthe, 6, room({ disorder: 0.6, strain: 0.8 }));

    // clean the whole house: it changes nothing, she is past that
    settle(marthe, 20, room({ disorder: 0, strain: 0.8 }));
    expect(marthe.state).toBe('complaining');

    settle(marthe, 4, room({ worthHearing: 0.9, clamour: 0.05 }));
    expect(marthe.state).toBe('settled');
  });
});

describe('Elijah: the collapse comes after the victory', () => {
  it('confronts a crowd following what it should not', () => {
    const elie = new Actor(ELIJAH_ARC);
    settle(elie, 2, room({ falsehood: 0.7 }));
    expect(elie.state).toBe('confronting');
  });

  it('breaks from sustained strain, not from losing', () => {
    const elie = new Actor(ELIJAH_ARC);
    settle(elie, 2, room({ falsehood: 0.7 }));
    settle(elie, 6, room({ falsehood: 0.7, strain: 0.9 }));
    expect(elie.state).toBe('spent');
    expect(elie.directive.move).toBe('away-from-player');
  });

  it('comes back for quiet, and for nothing louder', () => {
    const elie = new Actor(ELIJAH_ARC);
    settle(elie, 2, room({ falsehood: 0.7 }));
    settle(elie, 6, room({ falsehood: 0.7, strain: 0.9 }));
    settle(elie, 6, room({ strain: 0.9 }, { distanceToPlayer: 20 }));
    expect(elie.state).toBe('hidden');

    // shouting at him does nothing at all
    settle(elie, 30, room({ clamour: 0.8 }, { distanceToPlayer: 20 }));
    expect(elie.state).toBe('hidden');

    settle(elie, 10, room({ clamour: 0.05 }, { distanceToPlayer: 20 }));
    expect(elie.state).toBe('restored');
  });
});

describe('the scoring underneath', () => {
  it('ranks the same situation differently for each profile', () => {
    const situation: Situation = { ...CALM, disorder: 0.6, worthHearing: 0.8 };
    expect(appraise(MARTHA.drives, situation).response).toBe('tidy');
    expect(appraise(MARY.drives, situation).response).toBe('listen');
  });

  it('puts confrontation first for Elijah wherever falsehood is present', () => {
    const situation: Situation = { ...CALM, falsehood: 0.5, disorder: 0.9, worthHearing: 0.9 };
    expect(appraise(ELIJAH.drives, situation).response).toBe('confront');
  });

  it('makes rest attractive only once someone is actually spent', () => {
    const fresh = appraise(ELIJAH.drives, { ...CALM, strain: 0.3 });
    const spent = appraise(ELIJAH.drives, { ...CALM, strain: 0.95 });
    const rank = (a: ReturnType<typeof appraise>) =>
      a.ranked.findIndex((r) => r.response === 'withdraw');
    expect(rank(spent)).toBeLessThan(rank(fresh));
  });

  it('returns something for an empty room rather than throwing', () => {
    const quiet = appraise(MARTHA.drives, CALM);
    expect(quiet.utility).toBe(0);
    expect(quiet.ranked).toHaveLength(6);
  });
});
