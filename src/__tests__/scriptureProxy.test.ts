import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleScripture } from '../../functions-shared/scripture';

/**
 * The proxy exists so the App Key never reaches the browser. That is easy. The
 * part worth testing is that it does not become an open relay: without these
 * checks anyone who found the endpoint could spend the quota on any edition and
 * any path they liked, and the key would be doing the paying.
 */

const KEY = { appKey: 'test-key-not-a-real-one' };
const get = (path: string) => new Request('https://example.test' + path);

function stubUpstream(body: unknown, status = 200) {
  // the parameters are declared so the recorded calls stay typed
  const spy = vi.fn(async (_url: string, _init?: RequestInit) =>
    new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal('fetch', spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('it forwards exactly one shape of request', () => {
  it('serves a well formed passage lookup', async () => {
    const upstream = stubUpstream({ id: 'LUK.22.57', content: 'text', reference: 'Luc 22:57' });
    const response = await handleScripture(get('/scripture/bibles/93/passages/LUK.22.57'), KEY);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ reference: 'Luc 22:57' });

    const [url, init] = upstream.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.youversion.com/v1/bibles/93/passages/LUK.22.57');
    expect((init.headers as Record<string, string>)['X-YVP-App-Key']).toBe(KEY.appKey);
  });

  it('works wherever the host happens to mount it', async () => {
    stubUpstream({ content: 'text', reference: 'Luc 22:57' });
    for (const prefix of ['/scripture', '/api/scripture', '/.netlify/functions/scripture', '']) {
      const response = await handleScripture(get(`${prefix}/bibles/93/passages/LUK.22.57`), KEY);
      expect(response.status, prefix || '(root)').toBe(200);
    }
  });
});

describe('it refuses to be an open relay', () => {
  it('turns away anything that is not a passage lookup', async () => {
    const upstream = stubUpstream({});
    for (const path of [
      '/scripture/bibles',                       // enumerate the catalogue
      '/scripture/bibles/93',
      '/scripture/bibles/93/books',              // a different resource
      '/scripture/bibles/93/passages',           // no reference
      '/scripture/bibles/93/passages/LUK.22.57/extra',
      '/scripture/search?q=anything',
      '/scripture',
    ]) {
      const response = await handleScripture(get(path), KEY);
      expect(response.status, path).toBeGreaterThanOrEqual(400);
    }
    expect(upstream).not.toHaveBeenCalled(); // nothing left the building
  });

  it('serves only the editions this deployment names', async () => {
    stubUpstream({ content: 'text' });
    expect((await handleScripture(get('/scripture/bibles/93/passages/GEN.1.1'), KEY)).status).toBe(200);

    for (const id of ['1', '9999', '0', '111']) {
      const response = await handleScripture(get(`/scripture/bibles/${id}/passages/GEN.1.1`), KEY);
      expect(response.status, id).toBe(400);
    }
  });

  it('rejects a reference that is not USFM', async () => {
    const upstream = stubUpstream({});
    for (const ref of [
      '../../../etc/passwd',
      'LUK.22.57;DROP',
      'lowercase.1.1',
      'TOOLONG.1.1',
      'LUK.99999.1',
      'LUK',
    ]) {
      const response = await handleScripture(
        get('/scripture/bibles/93/passages/' + encodeURIComponent(ref)),
        KEY,
      );
      expect(response.status, ref).toBeGreaterThanOrEqual(400);
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it('answers nothing but GET', async () => {
    const upstream = stubUpstream({});
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      const request = new Request('https://example.test/scripture/bibles/93/passages/GEN.1.1', { method });
      expect((await handleScripture(request, KEY)).status).toBe(405);
    }
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe('it never leaks the credential, in success or failure', () => {
  it('says plainly when the deployment has no key rather than going quiet', async () => {
    const response = await handleScripture(
      get('/scripture/bibles/93/passages/GEN.1.1'),
      { appKey: undefined },
    );
    // 503 rather than an empty 200, which would read as a verse that does not exist
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('test-key');
  });

  it('passes a status through without the upstream body, which may name the key', async () => {
    stubUpstream({ error: 'invalid app key test-key-not-a-real-one' }, 401);
    const response = await handleScripture(get('/scripture/bibles/93/passages/GEN.1.1'), KEY);
    const body = await response.text();

    expect(response.status).toBe(500); // an upstream 401 is our misconfiguration, not the caller's
    expect(body).not.toContain(KEY.appKey);
    expect(body).not.toContain('invalid app key');
  });

  it('survives the platform not answering at all', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));
    const response = await handleScripture(get('/scripture/bibles/93/passages/GEN.1.1'), KEY);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('network down');
  });
});

describe('it lets the edge absorb the repeats', () => {
  it('caches a served passage, and never caches a refusal', async () => {
    stubUpstream({ content: 'text' });
    const served = await handleScripture(get('/scripture/bibles/93/passages/GEN.1.1'), KEY);
    expect(served.headers.get('cache-control')).toContain('s-maxage=86400');

    const refused = await handleScripture(get('/scripture/bibles/1/passages/GEN.1.1'), KEY);
    expect(refused.headers.get('cache-control')).toBe('no-store');
  });
});
