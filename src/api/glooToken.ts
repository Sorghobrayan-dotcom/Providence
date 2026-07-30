/**
 * The OAuth2 client-credentials exchange for Gloo AI.
 *
 * Server side only. The client secret must never reach a browser bundle, so
 * nothing in src/editor or src/providence may import this file — the dev proxy
 * and the deployed function are its only callers, and they hand the browser a
 * proxied path with no credential in it.
 *
 * The exchange is cached because a token is reusable until it expires and Gloo
 * says so in the response. Without the cache every generated line would cost
 * two round trips instead of one, and a character would be visibly slower to
 * speak the more he spoke.
 *
 * Docs: https://docs.gloo.com/tutorials/authentication
 */

const TOKEN_URL = 'https://platform.ai.gloo.com/oauth2/token';

/** Refresh this early, so a token cannot expire in flight. */
const EARLY_SECONDS = 60;

export interface GlooCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

interface Held {
  readonly token: string;
  /** Epoch milliseconds. */
  readonly expiresAt: number;
}

export interface TokenSourceOptions {
  readonly fetch?: typeof globalThis.fetch;
  readonly now?: () => number;
}

/**
 * Base64 for a Node/edge runtime without assuming either.
 *
 * Buffer does not exist on Cloudflare Workers and btoa did not exist in older
 * Node, so the deployed function would break on whichever host we assumed.
 */
function basic(id: string, secret: string): string {
  const raw = `${id}:${secret}`;
  if (typeof btoa === 'function') return btoa(raw);
  return Buffer.from(raw, 'utf8').toString('base64');
}

export class GlooTokenSource {
  private readonly credentials: GlooCredentials;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly now: () => number;

  private held: Held | null = null;
  /** An exchange already in flight, so ten callers do not open ten exchanges. */
  private inFlight: Promise<string | null> | null = null;

  constructor(credentials: GlooCredentials, options: TokenSourceOptions = {}) {
    this.credentials = credentials;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
    this.now = options.now ?? Date.now;
  }

  get isConfigured(): boolean {
    return Boolean(this.credentials.clientId && this.credentials.clientSecret);
  }

  /** A usable token, or null when none can be had. Never throws. */
  async token(): Promise<string | null> {
    if (!this.isConfigured) return null;

    const held = this.held;
    if (held && this.now() < held.expiresAt) return held.token;

    // a second caller arriving mid-exchange waits for the first one's result
    this.inFlight ??= this.exchange().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  /** Drop the cached token. Used when the API rejects it as stale anyway. */
  forget(): void {
    this.held = null;
  }

  private async exchange(): Promise<string | null> {
    try {
      const response = await this.fetchImpl(TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic(this.credentials.clientId, this.credentials.clientSecret)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&scope=api/access',
      });

      if (!response.ok) return null;

      const body = (await response.json()) as { access_token?: string; expires_in?: number };
      if (!body.access_token) return null;

      /* Trust the server's lifetime, but never cache for longer than it said,
         and never for zero: a malformed expires_in that lands at 0 would turn
         every request back into two. */
      const lifetime = Math.max(EARLY_SECONDS + 1, body.expires_in ?? 3600);
      this.held = {
        token: body.access_token,
        expiresAt: this.now() + (lifetime - EARLY_SECONDS) * 1000,
      };
      return body.access_token;
    } catch {
      // the network is allowed to fail; a character simply stays silent
      return null;
    }
  }
}
