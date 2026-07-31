import { promptFor, recites, tidy, type Occasion } from '../providence/Utterance';

/**
 * The browser half of the voice.
 *
 * There is no credential in this file and there must never be one. It posts to
 * a same-origin path; the dev plugin and the deployed function are what hold
 * the client secret and exchange it for a bearer token.
 *
 * Every failure returns null, and null means the character says nothing. That
 * is not a degraded mode to be patched later — a game that invents a line when
 * the network is down is exactly what this project exists to argue against.
 */

const ENDPOINT = '/gloo/ai/v2/chat/completions';

/**
 * Measured against the live API, a bark takes 3.5 to 4.7 seconds. The first cut
 * of this was 6000 and it cut real answers off: 1.3 seconds of headroom is not
 * headroom. This is deliberately generous, because the caller drops a stale
 * line on arrival anyway and a slow answer beats a fabricated one.
 */
const TIMEOUT_MS = 12000;

interface Completion {
  choices?: { message?: { content?: string } }[];
}

export class GlooVoice {
  private readonly endpoint: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  /** Set when Gloo has answered at least once, so the editor can report it. */
  private lastOutcome: 'idle' | 'spoke' | 'silent' | 'recited' | 'unconfigured' = 'idle';

  constructor(endpoint = ENDPOINT, fetchImpl: typeof globalThis.fetch = globalThis.fetch) {
    this.endpoint = endpoint;
    this.fetchImpl = fetchImpl.bind(globalThis);
  }

  get outcome(): string {
    return this.lastOutcome;
  }

  /** One line in character, or null. Never throws, never invents. */
  async speak(occasion: Occasion): Promise<string | null> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abort.signal,
        body: JSON.stringify({
          messages: promptFor(occasion),
          // exactly one routing mechanism may be given; let Gloo choose the model
          auto_routing: true,
          temperature: 0.9,
          // a bark, not an essay: cap it at the source rather than truncating later
          max_tokens: 120,
        }),
      });

      if (response.status === 503) {
        this.lastOutcome = 'unconfigured';
        return null;
      }
      if (!response.ok) {
        this.lastOutcome = 'silent';
        return null;
      }

      const body = (await response.json()) as Completion;
      const line = tidy(body.choices?.[0]?.message?.content ?? '');

      /* Checked rather than trusted. The prompt forbids reciting and a model
         obeys a prompt most of the time, which is not the standard held
         anywhere else here — and paraphrase printed beside a reference reads as
         Scripture and is not. A line that recites is refused, which means the
         character says nothing, which is always the correct output. */
      if (line !== null && recites(line, occasion.passage)) {
        this.lastOutcome = 'recited';
        return null;
      }

      this.lastOutcome = line ? 'spoke' : 'silent';
      return line;
    } catch {
      this.lastOutcome = 'silent';
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}
