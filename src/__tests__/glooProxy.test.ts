import { describe, expect, it, vi } from 'vitest';

import { handleGloo } from '../../functions-shared/gloo';

/**
 * The proxy the deployment did not have.
 *
 * `vite.config.ts` stood in for this in development and nothing stood in for it
 * in production, so a deployed site answered `/gloo/...` with a 404, the voice
 * read that as silence, and every character on the public demo described itself
 * instead of speaking. The one feature the project is built around was missing
 * the moment it left the machine it was written on, and nothing said so.
 *
 * Proxying is trivial. Proxying without publishing a free language model on
 * somebody else's quota is the part worth asserting, so most of what follows is
 * about what does NOT get forwarded.
 */

const ENDPOINT = 'https://demo.example/gloo/ai/v2/chat/completions';
const CREDENTIALS = { clientId: 'id', clientSecret: 'secret' };

const line = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({ messages: [{ role: 'user', content: 'Écris sa réplique.' }], ...over });

const post = (body: string, url = ENDPOINT): Request =>
  new Request(url, { method: 'POST', body, headers: { 'content-type': 'application/json' } });

/** A Gloo that hands out a token and then answers, counting what it was sent. */
function server(answer: unknown = { choices: [{ message: { content: 'Non.' } }] }, status = 200) {
  const sent: { url: string; init: RequestInit }[] = [];
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({ url: String(url), init: init ?? {} });
    if (String(url).includes('oauth2/token')) {
      return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 });
    }
    return new Response(JSON.stringify(answer), { status });
  });
  return { impl: impl as unknown as typeof fetch, sent };
}

/** What actually left for the completions endpoint. */
const forwarded = (sent: { url: string; init: RequestInit }[]): Record<string, unknown> =>
  JSON.parse(String(sent.find((s) => s.url.includes('completions'))?.init.body));

describe('it forwards a line and nothing else', () => {
  it('answers with what Gloo said', async () => {
    const gloo = server();
    const response = await handleGloo(post(line()), CREDENTIALS, gloo.impl);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ choices: [{ message: { content: 'Non.' } }] });
  });

  /* Its own credentials, because the token source is deliberately module-level:
     an edge isolate is reused between requests and that is the difference
     between one exchange and one per generated line. The consequence is that it
     survives across tests too, so a test about exchanges has to start from a
     credential no other test has used. */
  it('buys a token first, and reuses it for the next line', async () => {
    const fresh = { clientId: 'only-this-test', clientSecret: 'secret' };
    const gloo = server();
    await handleGloo(post(line()), fresh, gloo.impl);
    await handleGloo(post(line()), fresh, gloo.impl);

    expect(gloo.sent.filter((s) => s.url.includes('oauth2/token'))).toHaveLength(1);
    expect(gloo.sent.filter((s) => s.url.includes('completions'))).toHaveLength(2);
  });

  it('starts a new exchange when the deployment is given a different client', async () => {
    const gloo = server();
    await handleGloo(post(line()), { clientId: 'one', clientSecret: 's' }, gloo.impl);
    await handleGloo(post(line()), { clientId: 'two', clientSecret: 's' }, gloo.impl);

    expect(gloo.sent.filter((s) => s.url.includes('oauth2/token'))).toHaveLength(2);
  });

  it('sends the credential upstream and never back to the caller', async () => {
    const gloo = server();
    const response = await handleGloo(post(line()), CREDENTIALS, gloo.impl);

    const headers = gloo.sent.find((s) => s.url.includes('completions'))?.init.headers;
    expect(JSON.stringify(headers)).toContain('Bearer tok');
    expect(JSON.stringify([...response.headers])).not.toMatch(/bearer|secret/i);
    expect(await response.text()).not.toMatch(/tok|secret/);
  });
});

describe('what it refuses to become', () => {
  it('will not answer anything but a chat completion', async () => {
    const gloo = server();
    const response = await handleGloo(post(line(), 'https://demo.example/gloo/ai/v2/models'), CREDENTIALS, gloo.impl);

    expect(response.status).toBe(404);
    expect(gloo.sent).toHaveLength(0);
  });

  it('will not answer a GET', async () => {
    const gloo = server();
    const response = await handleGloo(new Request(ENDPOINT), CREDENTIALS, gloo.impl);
    expect(response.status).toBe(405);
    expect(gloo.sent).toHaveLength(0);
  });

  it('caps what a caller may spend, whatever the caller asks for', async () => {
    const gloo = server();
    await handleGloo(post(line({ max_tokens: 100000, temperature: 9 })), CREDENTIALS, gloo.impl);

    const body = forwarded(gloo.sent);
    expect(body['max_tokens']).toBe(200);
    expect(body['temperature']).toBe(1.5);
  });

  it('drops any field it was not going to send anyway', async () => {
    const gloo = server();
    await handleGloo(post(line({ model: 'something-expensive', tools: [{ name: 'shell' }] })), CREDENTIALS, gloo.impl);

    const body = forwarded(gloo.sent);
    expect(body).not.toHaveProperty('model');
    expect(body).not.toHaveProperty('tools');
    expect(body['auto_routing']).toBe(true);
  });

  it('refuses a conversation longer than a bark, and a body larger than one', async () => {
    const gloo = server();
    const many = JSON.stringify({
      messages: Array.from({ length: 9 }, () => ({ role: 'user', content: 'x' })),
    });
    expect((await handleGloo(post(many), CREDENTIALS, gloo.impl)).status).toBe(400);

    const huge = JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(9000) }] });
    expect((await handleGloo(post(huge), CREDENTIALS, gloo.impl)).status).toBe(413);
    expect(gloo.sent).toHaveLength(0);
  });

  it('refuses a message that is not one', async () => {
    const gloo = server();
    for (const body of [
      '{}',
      JSON.stringify({ messages: [] }),
      JSON.stringify({ messages: [{ role: 'assistant', content: 'x' }] }),
      JSON.stringify({ messages: [{ role: 'user' }] }),
      'not json at all',
    ]) {
      expect((await handleGloo(post(body), CREDENTIALS, gloo.impl)).status, body.slice(0, 30)).toBe(400);
    }
    expect(gloo.sent).toHaveLength(0);
  });
});

describe('when it cannot serve', () => {
  it('says unconfigured rather than broken, which the voice reads differently', async () => {
    const gloo = server();
    const response = await handleGloo(post(line()), { clientId: '', clientSecret: '' }, gloo.impl);

    // GlooVoice maps 503 to 'unconfigured' and anything else to 'silent'
    expect(response.status).toBe(503);
    expect(gloo.sent).toHaveLength(0);
  });

  it('never passes an upstream error body through', async () => {
    const gloo = server({ error: 'invalid client_secret abc123' }, 400);
    const response = await handleGloo(post(line()), CREDENTIALS, gloo.impl);

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('abc123');
  });

  it('survives the network refusing outright', async () => {
    const dead = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    const response = await handleGloo(post(line()), CREDENTIALS, dead);
    expect(response.status).toBe(502);
  });
});
