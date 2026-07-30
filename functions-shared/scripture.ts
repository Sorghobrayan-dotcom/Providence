/**
 * The Scripture proxy, written once against web standards.
 *
 * In development `vite.config.ts` does this job. In production it has to be a
 * function, because the whole point is that the App Key never reaches the
 * browser: anything Vite exposes with a VITE_ prefix is compiled into the
 * bundle and readable by anyone who opens the dev tools.
 *
 * Request and Response are used directly rather than any host's helper types, so
 * the same file runs on Netlify Edge, Vercel Edge and Cloudflare Pages. The
 * adapters in netlify/, api/ and functions/ are three lines each.
 *
 * The hard part is not proxying. It is proxying without becoming an open relay
 * that lets a stranger spend your quota, so every part of the incoming path is
 * checked against a whitelist before anything is forwarded.
 */

const UPSTREAM = 'https://api.youversion.com/v1';

/** USFM: three letters or digits, a chapter, optionally a verse. Nothing else. */
const REFERENCE = /^[A-Z0-9]{3}\.\d{1,3}(\.\d{1,3})?$/;

/**
 * Editions this deployment is willing to serve. An unbounded id would let a
 * caller enumerate the whole catalogue on our quota.
 *   93 Segond 1910 · 3034 Berean Standard · 62 Martin · 131 Ostervald · 64 Darby
 */
const ALLOWED_BIBLES = new Set(['93', '3034', '62', '131', '64']);

export interface ProxyEnv {
  readonly appKey: string | undefined;
}

interface Refusal {
  readonly status: number;
  readonly reason: string;
}

/**
 * Pull `bibles/{id}/passages/{ref}` out of the path, wherever the host mounted
 * the function, and refuse anything that is not exactly that shape.
 */
function target(pathname: string): { url: string } | Refusal {
  const parts = pathname.split('/').filter(Boolean);
  const start = parts.indexOf('bibles');
  if (start === -1) return { status: 404, reason: 'only passage lookups are proxied' };

  // from `bibles` onward the tail must be exactly four segments and no more
  const tail = parts.slice(start);
  if (tail.length !== 4) return { status: 404, reason: 'only passage lookups are proxied' };

  const [, bibleId, kind, reference] = tail;
  if (kind !== 'passages') return { status: 404, reason: 'only passage lookups are proxied' };
  if (!bibleId || !ALLOWED_BIBLES.has(bibleId)) {
    return { status: 400, reason: 'that edition is not served by this deployment' };
  }
  if (!reference || !REFERENCE.test(reference)) {
    return { status: 400, reason: 'reference must look like LUK.22.57' };
  }

  return { url: `${UPSTREAM}/bibles/${bibleId}/passages/${reference}` };
}

const json = (body: unknown, status: number, cache = 'no-store'): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache },
  });

export async function handleScripture(request: Request, env: ProxyEnv): Promise<Response> {
  if (request.method !== 'GET') {
    return json({ error: 'only GET' }, 405);
  }

  const chosen = target(new URL(request.url).pathname);
  if ('reason' in chosen) {
    return json({ error: chosen.reason }, chosen.status);
  }

  if (!env.appKey) {
    /* Deliberately explicit. A silent empty response would look like a verse
       that does not exist, and the engine would go quiet for the wrong reason. */
    return json({ error: 'no App Key configured on this deployment' }, 503);
  }

  let upstream: Response;
  try {
    upstream = await fetch(chosen.url, {
      headers: { 'X-YVP-App-Key': env.appKey, accept: 'application/json' },
    });
  } catch {
    return json({ error: 'the platform did not answer' }, 502);
  }

  if (!upstream.ok) {
    // pass the status through, never the body: it may name the credential
    return json({ error: `platform returned ${upstream.status}` }, upstream.status === 401 ? 500 : 502);
  }

  const payload = await upstream.text();

  /* Scripture does not change, so let the CDN absorb every repeat. A day of
     shared cache plus a week of stale-while-revalidate means a judge clicking
     around costs one upstream call per verse, not one per click. */
  return new Response(payload, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
