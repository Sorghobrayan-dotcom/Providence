export interface GlooConfig {
  readonly apiKey: string | undefined;
  readonly baseUrl: string;
}

export interface FreeformVerdict {
  readonly correct: boolean;
  readonly reasoning: string;
}

/**
 * Wraps Gloo AI Studio's inference API for the one place combat needs
 * judgment rather than a lookup: the final phase's free-form rebuttal,
 * where the player writes their own words instead of picking from the
 * arsenal. Endpoint path and payload are provisional pending real Studio
 * docs — isolated here so the rest of the game never touches the wire format.
 */
export class GlooClient {
  private readonly config: GlooConfig;

  constructor(config: GlooConfig) {
    this.config = config;
  }

  get isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  async judgeFreeformAnswer(lie: string, answerText: string): Promise<FreeformVerdict | null> {
    if (!this.isConfigured) return null;
    try {
      const response = await fetch(`${this.config.baseUrl}/chat/judge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ lie, answer: answerText }),
      });
      if (!response.ok) return null;
      return (await response.json()) as FreeformVerdict;
    } catch {
      return null;
    }
  }
}

const MIN_MATCHING_KEYWORDS = 2;
const MIN_ANSWER_LENGTH = 12;

/**
 * Fully offline stand-in for Gloo's semantic judgment. Used whenever no API
 * key is configured or the network call fails, so a judge can always
 * finish the demo without live credentials — never blocks the encounter.
 */
export function judgeFreeformOffline(
  answerText: string,
  expectedKeywords: readonly string[],
): FreeformVerdict {
  const normalized = answerText.trim().toLowerCase();
  if (normalized.length < MIN_ANSWER_LENGTH) {
    return { correct: false, reasoning: 'Ta réponse est trop courte pour contrer ce mensonge.' };
  }
  const matches = expectedKeywords.filter((keyword) => normalized.includes(keyword.toLowerCase()));
  const correct = matches.length >= MIN_MATCHING_KEYWORDS;
  return {
    correct,
    reasoning: correct
      ? `Ta réponse tient : elle touche à ${matches.join(', ')}.`
      : "Ta réponse ne cite pas assez précisément ce que Dieu a promis.",
  };
}
