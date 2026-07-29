import type { Verse } from '../data/verses';

export interface YouVersionConfig {
  /**
   * Only ever set when running OUTSIDE a browser (tests, scripts, a serverless
   * function). In the app this stays undefined: the browser holds no credential
   * at all, and the dev-server proxy attaches the App Key on the way out. See
   * vite.config.ts.
   */
  readonly apiKey?: string | undefined;
  /** Same-origin proxy path by default, so nothing secret reaches the client. */
  readonly baseUrl: string;
}

export interface FetchedVerse {
  readonly reference: string;
  readonly text: string;
  readonly languageTag: string;
}

export type LanguageTag = 'fra' | 'eng';

/**
 * Which edition each language resolves to, confirmed against
 * GET /v1/bibles?language_ranges[]=fra on the live platform:
 *   62 Martin 1744 · 93 Segond 1910 · 131 Ostervald · 64 Darby
 * Segond is the natural French default, and the Berean Standard Bible is the
 * English edition the platform documents in its own examples.
 */
export const BIBLE_ID: Record<LanguageTag, number> = {
  fra: 93,
  eng: 3034,
};

/**
 * Thin wrapper around the YouVersion Platform API. The request/response
 * shape below is provisional: it must be confirmed against the real
 * developer docs once platform.youversion.com issues a key, but every
 * other module only ever talks to `fetchVerse`, so correcting the wire
 * format later is a one-file change.
 */
export class YouVersionClient {
  private readonly config: YouVersionConfig;

  constructor(config: YouVersionConfig) {
    this.config = config;
  }

  /**
   * Whether a route to Scripture exists at all. The browser cannot know if the
   * server holds a key, so a same-origin path always counts as worth trying and
   * the truth is decided by whether the call actually returns text.
   */
  get isConfigured(): boolean {
    return Boolean(this.config.apiKey) || this.config.baseUrl.startsWith('/');
  }

  async fetchVerse(reference: string, languageTag: LanguageTag = 'fra'): Promise<FetchedVerse | null> {
    if (!this.isConfigured) return null;
    try {
      /* Verified against the live platform: passages hang off a specific
         edition, so the language is chosen by picking the Bible id rather than
         by a query parameter. The platform issues an App Key, not a bearer
         token, and identifies the caller by this header. */
      const url = `${this.config.baseUrl}/bibles/${BIBLE_ID[languageTag]}/passages/${encodeURIComponent(reference)}`;
      // the header is sent only outside the browser; the proxy supplies it otherwise
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.config.apiKey) headers['X-YVP-App-Key'] = this.config.apiKey;
      const response = await fetch(url, { headers });
      if (!response.ok) return null;
      const payload = (await response.json()) as { id?: string; reference?: string; content?: string };
      const text = (payload.content ?? '').trim();
      if (!text) return null;
      return { reference: payload.reference ?? reference, text, languageTag };
    } catch {
      return null;
    }
  }
}

export interface ResolvedVerseText {
  readonly reference: string;
  readonly text: string;
  readonly source: 'live' | 'offline';
}

/** Live YouVersion text when reachable, the embedded public-domain copy otherwise. */
export async function resolveVerseDisplayText(
  client: YouVersionClient,
  verse: Verse,
  languageTag: LanguageTag = 'fra',
): Promise<ResolvedVerseText> {
  const fetched = await client.fetchVerse(verse.reference, languageTag);
  if (fetched) {
    return { reference: fetched.reference, text: fetched.text, source: 'live' };
  }
  return {
    reference: verse.reference,
    text: languageTag === 'fra' ? verse.textFr : verse.textEn,
    source: 'offline',
  };
}
