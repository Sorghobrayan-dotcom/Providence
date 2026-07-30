import { describe, expect, it, vi } from 'vitest';

import { GlooTokenSource } from '../api/glooToken';
import { GlooVoice } from '../api/GlooVoice';
import { promptFor, tidy, type Occasion } from '../providence/Utterance';
import { NO_COVENANT, covenantOf } from '../providence/covenant';
import { UNDEFILED, shedBlood } from '../providence/standing';
import { RelationGraph } from '../providence/relations';
import { LIBRARY } from '../providence/arcs';

/**
 * The generated voice.
 *
 * The network is never touched here. What is worth pinning is the token cache,
 * which is the difference between one round trip per line and two, and the
 * prompt, which is the actual design work: change it and every character in the
 * game sounds different.
 */

const jonah = LIBRARY.find((a) => a.id === 'jonah')!;

const occasion = (over: Partial<Occasion> = {}): Occasion => ({
  arc: jonah,
  node: 'shrinking',
  from: 'commissioned',
  directive: { move: 'away-from-player', posture: 'averting', refusing: true },
  disposition: { trust: 0.2, fear: 0.8, resolve: 0.3 },
  standing: UNDEFILED,
  covenant: NO_COVENANT,
  reference: 'JON.4.2',
  ...over,
});

/** A fetch that answers the token endpoint and counts how often it was asked. */
function tokenServer(expiresIn = 3600) {
  let calls = 0;
  const fetchImpl = vi.fn(async () => {
    calls += 1;
    return new Response(
      JSON.stringify({ access_token: `tok-${calls}`, expires_in: expiresIn }),
      { status: 200 },
    );
  });
  return { fetchImpl, calls: () => calls };
}

describe('the token', () => {
  it('reports itself unconfigured rather than calling out with nothing', async () => {
    const server = tokenServer();
    const source = new GlooTokenSource(
      { clientId: '', clientSecret: '' },
      { fetch: server.fetchImpl as unknown as typeof fetch },
    );
    expect(source.isConfigured).toBe(false);
    expect(await source.token()).toBeNull();
    expect(server.calls()).toBe(0);
  });

  it('sends the client credentials as Basic auth, not in the body', async () => {
    const server = tokenServer();
    const source = new GlooTokenSource(
      { clientId: 'id', clientSecret: 'secret' },
      { fetch: server.fetchImpl as unknown as typeof fetch },
    );
    await source.token();

    const [url, init] = server.fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://platform.ai.gloo.com/oauth2/token');
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Basic ${btoa('id:secret')}`);
    expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(init.body).toBe('grant_type=client_credentials&scope=api/access');
    // the secret must not also be sitting in the form body
    expect(String(init.body)).not.toContain('secret');
  });

  it('reuses a live token instead of buying one per line', async () => {
    const server = tokenServer();
    const source = new GlooTokenSource(
      { clientId: 'id', clientSecret: 's' },
      { fetch: server.fetchImpl as unknown as typeof fetch },
    );
    for (let i = 0; i < 5; i += 1) await source.token();
    expect(server.calls()).toBe(1);
  });

  it('refreshes before expiry rather than after it', async () => {
    const server = tokenServer(120);
    let clock = 0;
    const source = new GlooTokenSource(
      { clientId: 'id', clientSecret: 's' },
      { fetch: server.fetchImpl as unknown as typeof fetch, now: () => clock },
    );

    await source.token();
    clock = 59_000; // still inside the 120s − 60s window
    await source.token();
    expect(server.calls()).toBe(1);

    clock = 61_000; // past it, and still well before the token truly dies
    await source.token();
    expect(server.calls()).toBe(2);
  });

  it('does not open ten exchanges for ten simultaneous callers', async () => {
    const server = tokenServer();
    const source = new GlooTokenSource(
      { clientId: 'id', clientSecret: 's' },
      { fetch: server.fetchImpl as unknown as typeof fetch },
    );
    await Promise.all(Array.from({ length: 10 }, () => source.token()));
    expect(server.calls()).toBe(1);
  });

  it('never caches a failure, and never throws one', async () => {
    let ok = false;
    const fetchImpl = vi.fn(async () =>
      ok ? new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 })
         : new Response('nope', { status: 401 }));
    const source = new GlooTokenSource(
      { clientId: 'id', clientSecret: 's' },
      { fetch: fetchImpl as unknown as typeof fetch },
    );

    expect(await source.token()).toBeNull();
    ok = true;
    expect(await source.token()).toBe('t');
  });

  it('survives the network throwing outright', async () => {
    const source = new GlooTokenSource(
      { clientId: 'id', clientSecret: 's' },
      { fetch: (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch },
    );
    await expect(source.token()).resolves.toBeNull();
  });
});

describe('the prompt', () => {
  it('carries the structure and never a line of dialogue', () => {
    const messages = promptFor(occasion());
    const [system, user] = [messages[0]!, messages[1]!];

    expect(system.content).toContain('UNE seule réplique');
    expect(system.content).toMatch(/Ne cite JAMAIS un verset/);

    expect(user.content).toContain('Le Réticent');
    expect(user.content).toContain('commissioned');
    expect(user.content).toContain('shrinking');
    expect(user.content).toContain('JON.4.2');
    expect(user.content).toContain('averting');
  });

  it('describes the disposition in words, because numbers come back as numbers', () => {
    const { content } = promptFor(occasion())[1]!;
    expect(content).toContain('peur : terrifié');
    expect(content).toContain('résolution : effondrée');
    expect(content).not.toMatch(/0\.\d/);
  });

  it('changes what it says about the asker with the asker', () => {
    const graph = new RelationGraph();
    graph.commit({ kind: 'betray', actor: 'player', toward: 'x' });

    const stranger = promptFor(occasion())[1]!.content;
    const guilty = promptFor(occasion({ covenant: covenantOf(graph) }))[1]!.content;

    expect(stranger).toContain('dont on ne sait rien');
    expect(guilty).toContain('rompue');
    expect(stranger).not.toBe(guilty);
  });

  it('tells the model a secret is a secret, and not to confess it', () => {
    const open = promptFor(occasion({ standing: shedBlood(UNDEFILED, false) }))[1]!.content;
    const kept = promptFor(occasion({ standing: shedBlood(UNDEFILED, true) }))[1]!.content;

    expect(open).toContain('du sang sur les mains');
    expect(open).not.toContain('Il ne l\'avoue pas');
    expect(kept).toContain('Il ne l\'avoue pas');
  });

  it('hands the passage over as a reason, marked as not being his words', () => {
    const { content } = promptFor(occasion({ passage: 'Je savais que tu es un Dieu compatissant.' }))[1]!;
    expect(content).toContain('sa raison, pas ses mots');
    expect(content).toContain('Je savais que tu es un Dieu compatissant.');
  });
});

describe('tidying what came back', () => {
  it('keeps a clean line untouched', () => {
    expect(tidy('Ne me demande pas ça.')).toBe('Ne me demande pas ça.');
  });

  it('strips the quotes a model insists on adding', () => {
    expect(tidy('« Ne me demande pas ça. »')).toBe('Ne me demande pas ça.');
    expect(tidy('"Ne me demande pas ça."')).toBe('Ne me demande pas ça.');
  });

  it('strips a speaker label and stage directions', () => {
    expect(tidy('Jonas : Ne me demande pas ça.')).toBe('Ne me demande pas ça.');
    expect(tidy('(il recule) Ne me demande pas ça.')).toBe('Ne me demande pas ça.');
  });

  it('refuses an essay, because a bark is not a paragraph', () => {
    expect(tidy('mot '.repeat(90))).toBeNull();
  });

  it('refuses an empty answer instead of showing an empty plate', () => {
    expect(tidy('   ')).toBeNull();
    expect(tidy('(il se tait)')).toBeNull();
  });
});

describe('the voice', () => {
  const answering = (content: string, status = 200) =>
    vi.fn(async () => new Response(
      JSON.stringify({ choices: [{ message: { content } }] }), { status },
    ));

  it('returns the line and reports that it spoke', async () => {
    const voice = new GlooVoice('/gloo/x', answering('Ne me demande pas ça.') as unknown as typeof fetch);
    expect(await voice.speak(occasion())).toBe('Ne me demande pas ça.');
    expect(voice.outcome).toBe('spoke');
  });

  it('sends no credential of any kind', async () => {
    const fetchImpl = answering('x');
    const voice = new GlooVoice('/gloo/x', fetchImpl as unknown as typeof fetch);
    await voice.speak(occasion());

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.stringify(init.headers)).not.toMatch(/authorization|bearer|secret/i);
    expect(String(init.body)).not.toMatch(/client_secret|Bearer/i);
  });

  it('asks for exactly one routing mechanism', async () => {
    const fetchImpl = answering('x');
    const voice = new GlooVoice('/gloo/x', fetchImpl as unknown as typeof fetch);
    await voice.speak(occasion());

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    const routing = ['auto_routing', 'model', 'model_family'].filter((k) => k in body);
    expect(routing).toEqual(['auto_routing']);
  });

  it('stays silent rather than inventing when Gloo is unreachable', async () => {
    const voice = new GlooVoice(
      '/gloo/x',
      (() => Promise.reject(new Error('down'))) as unknown as typeof fetch,
    );
    expect(await voice.speak(occasion())).toBeNull();
    expect(voice.outcome).toBe('silent');
  });

  it('distinguishes no credentials from a refused request', async () => {
    const voice = new GlooVoice(
      '/gloo/x',
      (async () => new Response('{}', { status: 503 })) as unknown as typeof fetch,
    );
    expect(await voice.speak(occasion())).toBeNull();
    expect(voice.outcome).toBe('unconfigured');
  });
});
