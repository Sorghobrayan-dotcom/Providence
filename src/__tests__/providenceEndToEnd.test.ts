import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Actor, blankWorld } from '../providence/Actor';
import { PETER } from '../providence/arcs';
import { RelationGraph } from '../providence/relations';
import { Interpreter } from '../providence/Interpreter';
import { Scripture } from '../providence/Scripture';
import { YouVersionClient } from '../api/YouVersionClient';

/**
 * One scenario driven through every part of the engine at once, so the claim
 * "there is an engine here" can be checked rather than believed. It reads the
 * real App Key and calls the real platform: if the network or the key is gone,
 * the Scripture assertions are skipped and the mechanics are still proven.
 */

function appKey(): string | undefined {
  try {
    const env = readFileSync(join(__dirname, '..', '..', '.env'), 'utf8');
    for (const line of env.split(/\r?\n/)) {
      const [k, ...rest] = line.split('=');
      if (k?.trim() === 'YOUVERSION_APP_KEY') return rest.join('=').trim() || undefined;
    }
  } catch {
    /* no .env: the run stays offline */
  }
  return undefined;
}

describe('end to end: one story through the whole engine', () => {
  it('runs souls, relations, interpretation and Scripture together', async () => {
    const log: string[] = [];
    const key = appKey();
    const scripture = new Scripture(
      new YouVersionClient({ apiKey: key, baseUrl: 'https://api.youversion.com/v1' }),
      { pack: {}, store: null }, // no safety net, so anything printed is genuinely live
    );

    /* --- 1. a soul, under pressure --- */
    const peter = new Actor(PETER);
    const world = { ...blankWorld(), distanceToPlayer: 2, underThreat: true };
    let denial: string | null = null;
    for (let t = 0; t < 60 && !denial; t++) {
      const event = peter.update(1, world);
      if (event?.to === 'denying') denial = event.because;
    }
    expect(peter.state).toBe('denying');
    expect(peter.directive.companion).toBeUndefined();
    log.push(`soul      peter broke under threat, citing ${denial}`);

    /* --- 2. relations: the same deed weighed by two different bonds --- */
    const graph = new RelationGraph();
    graph.bind('player', 'stranger', 'stranger', 0.5);
    graph.bind('player', 'sworn', 'covenant', 0.5);
    const cheap = graph.commit({ kind: 'betray', actor: 'player', toward: 'stranger' });
    const grave = graph.commit({ kind: 'betray', actor: 'player', toward: 'sworn' });
    expect(grave.weight / cheap.weight).toBe(5);
    log.push(`relation  betrayal weighed ${cheap.weight} against a stranger, ${grave.weight} against a sworn ally`);

    /* --- 3. a blessing taken, and refused back --- */
    graph.bind('jacob', 'esau', 'kin', 0.7);
    graph.bind('esau', 'mother', 'kin', 0.9);
    graph.commit({ kind: 'bless', actor: 'isaac', toward: 'esau', amount: 10 });
    const theft = graph.commit({ kind: 'steal-blessing', actor: 'jacob', toward: 'esau' });
    expect(graph.holdingsOf('esau').some((h) => h.good === 'blessing')).toBe(false);
    expect(theft.reached).toContain('mother');
    log.push(`relation  the blessing moved to jacob and reached ${theft.reached.join(', ')}`);

    /* --- 4. rescue costs someone, and only a kinsman may pay --- */
    graph.bind('boaz', 'ruined', 'kin', 0.6);
    graph.commit({ kind: 'lend', actor: 'creditor', toward: 'ruined', amount: 50 });
    const outsider = graph.commit({ kind: 'redeem', actor: 'stranger', toward: 'ruined' });
    expect(outsider.refused).toBe('only a kinsman may redeem');
    graph.commit({ kind: 'redeem', actor: 'boaz', toward: 'ruined' });
    expect(graph.debtOf('ruined')).toBe(0);
    expect(graph.debtOf('boaz')).toBe(50);
    log.push('relation  a stranger was refused; boaz redeemed and now carries the 50');

    /* --- 5. forgiveness cancels the claim and keeps the record --- */
    const before = graph.ledger.length;
    graph.commit({ kind: 'forgive', actor: 'creditor', toward: 'boaz' });
    expect(graph.ledger.length).toBe(before + 1);
    log.push(`relation  ledger still holds all ${graph.ledger.length} deeds after forgiveness`);

    /* --- 6. the engine interprets first, and refuses what it cannot verify --- */
    const interpreter = new Interpreter(async () => ({ kind: 'invented', because: 'GEN.1.1' }));
    const known = await interpreter.interpret('trahison');
    const bogus = await interpreter.interpret('performed an unnamed rite');
    expect(known.decidedBy).toBe('engine');
    expect(bogus.decidedBy).toBe('refused');
    log.push(`decision  "trahison" settled by the ${known.decidedBy}; the model's invention was ${bogus.decidedBy}`);

    /* --- 7. Scripture, live, for the reference the soul actually cited --- */
    const line = denial ? await scripture.line(denial) : null;
    if (key && line) {
      expect(line.source).toBe('live');
      log.push(`scripture ${line.reference} served live: "${line.text.slice(0, 80)}..."`);
    } else {
      log.push('scripture no live source reachable, so nothing was said (as designed)');
    }

    console.log('\n' + log.map((l) => '  ' + l).join('\n') + '\n');
    expect(log).toHaveLength(7);
  }, 30000);
});
