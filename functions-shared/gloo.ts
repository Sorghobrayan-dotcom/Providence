import { GlooTokenSource } from '../src/api/glooToken.ts';

/**
 * The Gloo proxy, and the one the deployment was missing.
 *
 * `vite.config.ts` does this job in development and there was no production
 * counterpart, so a deployed site answered `/gloo/...` with a 404, `GlooVoice`
 * read that as silence, and every character on the public demo described itself
 * instead of speaking. The feature the whole thing is built around simply was
 * not there once it left this machine.
 *
 * It is a middleware rather than a proxy rule because Gloo is not a static key:
 * the client id and secret buy a bearer token that expires, so it has to await
 * one before it can forward anything. `GlooTokenSource` is the same class the
 * dev plugin uses and the same one the tests cover — caching, early refresh, and
 * one exchange for simultaneous callers.
 *
 * The hard part is not proxying. It is proxying without publishing a free
 * language model paid for on somebody else's quota, so what may be forwarded is
 * bounded here rather than trusted from the caller.
 */

const UPSTREAM = 'https://platform.ai.gloo.com';
const ENDPOINT = '/ai/v2/chat/completions';

/** A bark is twenty words. Anything near this is not one. */
const MAX_BODY_BYTES = 8_000;
const MAX_MESSAGES = 4;
/** Capped here whatever the caller asks for, because the caller is the internet. */
const MAX_TOKENS = 200;

export interface GlooEnv {
  readonly clientId: string | undefined;
  readonly clientSecret: string | undefined;
}

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/**
 * Kept across invocations. An edge isolate is reused, so this is the difference
 * between one token exchange and one per generated line.
 */
let source: GlooTokenSource | null = null;
let sourceFor = '';

function tokens(env: GlooEnv, fetchImpl: typeof fetch): GlooTokenSource {
  const id = env.clientId ?? '';
  const secret = env.clientSecret ?? '';
  if (!source || sourceFor !== id) {
    source = new GlooTokenSource({ clientId: id, clientSecret: secret }, { fetch: fetchImpl });
    sourceFor = id;
  }
  return source;
}

/** What we are willing to forward, rebuilt rather than passed through. */
function bounded(raw: unknown): { body: string } | { status: number; reason: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { status: 400, reason: 'a body is required' };
  }
  const asked = raw as Record<string, unknown>;
  const messages = asked['messages'];

  if (!Array.isArray(messages) || messages.length === 0) {
    return { status: 400, reason: 'messages are required' };
  }
  if (messages.length > MAX_MESSAGES) {
    return { status: 400, reason: `at most ${MAX_MESSAGES} messages` };
  }
  for (const message of messages) {
    if (typeof message !== 'object' || message === null) {
      return { status: 400, reason: 'each message must be an object' };
    }
    const { role, content } = message as Record<string, unknown>;
    if (role !== 'system' && role !== 'user') {
      return { status: 400, reason: 'a message is from system or user' };
    }
    if (typeof content !== 'string' || content.length === 0) {
      return { status: 400, reason: 'a message needs content' };
    }
  }

  /* Rebuilt from the fields this deployment is prepared to send, so a caller
     cannot reach for a tool, a longer answer or a different model by adding a
     key we never looked at. */
  const temperature = typeof asked['temperature'] === 'number' ? asked['temperature'] : 0.9;
  const wanted = typeof asked['max_tokens'] === 'number' ? asked['max_tokens'] : MAX_TOKENS;

  return {
    body: JSON.stringify({
      messages,
      auto_routing: true,
      temperature: Math.max(0, Math.min(1.5, temperature)),
      max_tokens: Math.max(1, Math.min(MAX_TOKENS, wanted)),
    }),
  };
}

export async function handleGloo(
  request: Request,
  env: GlooEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'only POST' }, 405);
  }
  if (!new URL(request.url).pathname.endsWith(ENDPOINT)) {
    return json({ error: 'only chat completions are proxied' }, 404);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: 'body too large for a line of dialogue' }, 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ error: 'body must be JSON' }, 400);
  }

  const allowed = bounded(parsed);
  if ('reason' in allowed) {
    return json({ error: allowed.reason }, allowed.status);
  }

  if (!env.clientId || !env.clientSecret) {
    /* 503 exactly, because GlooVoice reads it as "unconfigured" and distinguishes
       it from a refused request. A missing credential and a broken one look the
       same from a browser otherwise, and that is an afternoon. */
    return json({ error: 'no Gloo credentials on this deployment' }, 503);
  }

  const token = await tokens(env, fetchImpl).token();
  if (!token) {
    return json({ error: 'Gloo refused the client credentials' }, 502);
  }

  let upstream: Response;
  try {
    upstream = await fetchImpl(`${UPSTREAM}${ENDPOINT}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: allowed.body,
    });
  } catch {
    return json({ error: 'Gloo did not answer' }, 502);
  }

  if (upstream.status === 401) {
    // a token it no longer accepts must not stay cached
    source = null;
    sourceFor = '';
  }
  if (!upstream.ok) {
    // the status, never the body: an error from a platform can quote the credential back
    return json({ error: `Gloo returned ${upstream.status}` }, 502);
  }

  return new Response(await upstream.text(), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
