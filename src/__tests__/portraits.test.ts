import { describe, expect, it } from 'vitest';

import { PENDING, PORTRAITS, portraitFor } from '../providence/portraits';
import { PUBLIC_DOMAIN_PACK } from '../providence/Scripture';
import { LIBRARY } from '../providence/arcs';
import { promptFor, type Occasion } from '../providence/Utterance';
import { NO_COVENANT, covenantOf } from '../providence/covenant';
import { UNDEFILED } from '../providence/standing';
import { RelationGraph } from '../providence/relations';

/**
 * The portraits.
 *
 * The voice was structural and nothing else: which node, how afraid, what the
 * player's record says. That is enough to make a character say something
 * plausible and not nearly enough to make him sound like himself, so all
 * twenty four spoke in the same careful register — the fugitive, the judge who
 * fears neither God nor man, and the woman who says nothing until she says
 * everything, all in one voice.
 *
 * Every claim in here has to be answerable from the text, which is what the
 * references are for and why the tests below insist on them. A portrait is not
 * characterisation we invented; it is a reading, and a reading can be checked.
 */

const USFM = /^[A-Z0-9]{3}\.\d+(\.\d+)?$/;

describe('every portrait is a reading, not an invention', () => {
  it('anchors the wound, the desire and every refusal to a passage', () => {
    for (const p of PORTRAITS) {
      expect(p.wound.source, `${p.arcId} wound`).toMatch(USFM);
      expect(p.desire.source, `${p.arcId} desire`).toMatch(USFM);
      expect(p.never.length, `${p.arcId} refuses nothing`).toBeGreaterThan(0);
      for (const never of p.never) expect(never.source, `${p.arcId} never`).toMatch(USFM);
    }
  });

  it('holds no Scripture, only references to it', () => {
    const whole = JSON.stringify(PORTRAITS);
    for (const [usfm, texts] of Object.entries(PUBLIC_DOMAIN_PACK)) {
      for (const variant of [texts.fra, texts.eng]) {
        expect(whole.includes(variant.slice(20, 60)), `a portrait embeds ${usfm}`).toBe(false);
      }
    }
  });

  it('gives a register rather than a biography', () => {
    for (const p of PORTRAITS) {
      expect(p.voice.length, `${p.arcId} voice`).toBeGreaterThan(20);
      expect(p.voice.length, `${p.arcId} voice`).toBeLessThanOrEqual(140);
      expect(p.manners.length, `${p.arcId} manners`).toBeLessThanOrEqual(3);
    }
  });

  it('says how each one reads all three standings, including neutral', () => {
    for (const p of PORTRAITS) {
      for (const standing of ['just', 'neutral', 'transgressor'] as const) {
        expect(p.reading[standing].length, `${p.arcId} ${standing}`).toBeGreaterThan(15);
      }
    }
  });

  it('names an arc that exists, once each', () => {
    const ids = PORTRAITS.map((p) => p.arcId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(LIBRARY.some((a) => a.id === id), `${id} is not in the library`).toBe(true);
    }
  });
});

describe('nothing is missing quietly', () => {
  it('accounts for every arc in the library, written or openly pending', () => {
    const written = new Set(PORTRAITS.map((p) => p.arcId));
    const pending = new Set(PENDING);
    const unaccounted = LIBRARY.filter((a) => !written.has(a.id) && !pending.has(a.id)).map((a) => a.id);

    // a hole has to be declared; it must never be a portrait nobody noticed was absent
    expect(unaccounted).toEqual([]);
  });

  it('does not list an arc as pending that has since been written', () => {
    const written = new Set(PORTRAITS.map((p) => p.arcId));
    expect(PENDING.filter((id) => written.has(id))).toEqual([]);
  });

  it('hands back nothing rather than a stand-in for an arc with no portrait', () => {
    for (const id of PENDING) expect(portraitFor(id)).toBeUndefined();
    expect(portraitFor('no-such-arc')).toBeUndefined();
  });
});

describe('the voice actually reaches the prompt', () => {
  const jonah = LIBRARY.find((a) => a.id === 'jonah')!;
  const goliath = LIBRARY.find((a) => a.id === 'goliath')!;

  const occasion = (over: Partial<Occasion> = {}): Occasion => ({
    arc: jonah,
    node: 'commissioned',
    directive: { move: 'hold', posture: 'burdened' },
    disposition: { trust: 0.5, fear: 0.3, resolve: 0.25 },
    standing: UNDEFILED,
    covenant: NO_COVENANT,
    reference: 'JON.1',
    ...over,
  });

  it('carries his register, his wound and what he will never do', () => {
    const { content } = promptFor(occasion())[1]!;
    expect(content).toContain('Sa voix');
    expect(content).toContain('Sa blessure');
    expect(content).toContain('Ce qu\'il ne fera jamais');
  });

  it('reads the same record differently for the fugitive than the generic line does', () => {
    const graph = new RelationGraph();
    graph.commit({ kind: 'shed-blood', actor: 'player', toward: 'x' });

    const clean = promptFor(occasion())[1]!.content;
    const guilty = promptFor(occasion({ covenant: covenantOf(graph) }))[1]!.content;

    // the fugitive's own reading, not merely the standing restated
    expect(clean).not.toBe(guilty);
    expect(guilty).toContain('Ce que cela lui fait');
  });

  it('leaves an arc with no portrait exactly as it was, rather than inventing one', () => {
    const { content } = promptFor(occasion({ arc: goliath, node: 'presenting' }))[1]!;
    expect(content).not.toContain('Sa voix');
    expect(content).toContain(goliath.label);
  });
});
