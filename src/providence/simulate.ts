import { Actor, blankWorld } from './Actor';
import { colour, press, type Atmosphere } from './atmosphere';
import { appraise, type Profile } from './drives';
import { Grace } from './grace';
import { memoryFor } from './memory';
import { RelationGraph } from './relations';
import type { Arc, Situation } from './types';

/**
 * Headless runs, so behaviour can be measured instead of admired.
 *
 * A single playthrough tells you nothing: an arc that fires once could be luck.
 * A thousand runs of the same pair in two different rooms tells you whether the
 * place actually changes anything, and by how much.
 */

export interface Cast {
  readonly arc: Arc;
  readonly profile: Profile;
  readonly name: string;
}

export interface RunOptions {
  readonly place: Atmosphere;
  readonly cast: readonly Cast[];
  readonly runs: number;
  readonly seconds: number;
  /** Deterministic, so a report can be reproduced from its seed. */
  readonly seed?: number;
}

export interface Tally {
  readonly place: string;
  readonly runs: number;
  /** How many runs ended with each character in each state. */
  readonly endings: Record<string, Record<string, number>>;
  /** Every transition taken, summed across runs. */
  readonly transitions: Record<string, number>;
  /** How often each response won the appraisal, per character. */
  readonly wants: Record<string, Record<string, number>>;
  readonly graceEpisodes: number;
  readonly graceAnswered: number;
}

function rng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const bump = (bag: Record<string, number>, key: string): void => {
  bag[key] = (bag[key] ?? 0) + 1;
};

/**
 * Drive a scene that pushes and releases, so characters meet strain rather than
 * a constant. A flat world would never show a breaking point.
 */
function sceneAt(t: number, seconds: number, roll: () => number): Situation {
  const arc = t / seconds;
  return {
    disorder: roll() < 0.25 ? 0.3 + roll() * 0.5 : 0,
    unmetNeed: roll() < 0.2 ? 0.4 + roll() * 0.4 : 0,
    falsehood: roll() < 0.15 ? 0.4 + roll() * 0.5 : 0,
    worthHearing: roll() < 0.3 ? 0.4 + roll() * 0.5 : 0,
    clamour: roll() * 0.4,
    // pressure builds through the middle of a run and eases at the end
    strain: Math.min(1, Math.sin(arc * Math.PI) * (0.5 + roll() * 0.6)),
  };
}

export function simulate(options: RunOptions): Tally {
  const roll = rng(options.seed ?? 20260801);
  const endings: Record<string, Record<string, number>> = {};
  const transitions: Record<string, number> = {};
  const wants: Record<string, Record<string, number>> = {};
  let graceEpisodes = 0;
  let graceAnswered = 0;

  for (const member of options.cast) {
    endings[member.name] = {};
    wants[member.name] = {};
  }

  for (let run = 0; run < options.runs; run++) {
    const graph = new RelationGraph();
    for (const member of options.cast) graph.bind(member.name, 'player', 'household', 0.5);

    const grace = new Grace(roll);
    /* Distance is simulated, not fixed. Without it a directive of
       "away-from-player" changes nothing, and every arc gated on getting away,
       Elijah's flight most of all, can never complete. */
    const actors = options.cast.map((member) => ({
      member,
      actor: new Actor(member.arc, memoryFor(graph, member.name)),
      drives: press(options.place, member.profile.drives),
      distance: 3,
    }));

    for (let t = 0; t < options.seconds; t++) {
      const situation = colour(options.place, sceneAt(t, options.seconds, roll));

      for (const state of actors) {
        const { member, actor, drives } = state;
        const event = actor.update(1, { ...blankWorld(), distanceToPlayer: state.distance, situation });
        if (event) bump(transitions, `${member.name}:${event.from}->${event.to}`);
        bump(wants[member.name] as Record<string, number>, appraise(drives, situation).response);

        // walk, at a plain metre or so a second, according to the intent
        const move = actor.directive.move;
        if (move === 'toward-player') state.distance = Math.max(1, state.distance - 1.5);
        else if (move === 'away-from-player' || move === 'away-from-errand') state.distance += 1.5;
      }

      // strain standing in for a closed situation, which is what grace watches
      const report = grace.observe(situation.strain > 0.92 ? 0.95 : 0.3, 1);
      if (report.outcome === 'given' || report.outcome === 'withheld') graceEpisodes += 1;
      if (report.outcome === 'given') graceAnswered += 1;
    }

    for (const { member, actor } of actors) {
      bump(endings[member.name] as Record<string, number>, actor.state);
    }
  }

  return {
    place: options.place.label,
    runs: options.runs,
    endings,
    transitions,
    wants,
    graceEpisodes,
    graceAnswered,
  };
}

/** A short console report, for a terminal or a log pane. */
export function report(tally: Tally): string {
  const lines: string[] = [`${tally.place}  ·  ${tally.runs} runs`];

  for (const [name, states] of Object.entries(tally.endings)) {
    const total = Object.values(states).reduce((a, b) => a + b, 0) || 1;
    const top = Object.entries(states)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([state, n]) => `${state} ${Math.round((n / total) * 100)}%`)
      .join('   ');
    const want = Object.entries(tally.wants[name] ?? {}).sort((a, b) => b[1] - a[1])[0];
    lines.push(`  ${name.padEnd(9)} ended: ${top.padEnd(46)} wanted mostly: ${want?.[0] ?? '-'}`);
  }

  const rate = tally.graceEpisodes === 0 ? 0 : tally.graceAnswered / tally.graceEpisodes;
  lines.push(`  grace     ${tally.graceAnswered}/${tally.graceEpisodes} episodes answered (${Math.round(rate * 100)}%)`);
  return lines.join('\n');
}
