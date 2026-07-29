import { describe, expect, it } from 'vitest';
import { YouVersionClient } from '../api/YouVersionClient';
import { PUBLIC_DOMAIN_PACK, Scripture } from '../providence/Scripture';
import { LIBRARY } from '../providence/arcs';
import { DEED_SOURCE } from '../providence/relations';

/** A client with no key configured: exactly what a judge gets if they delete .env */
const unconfigured = (): YouVersionClient =>
  new YouVersionClient({ apiKey: undefined, baseUrl: 'https://example.invalid' });

/** Stands in for the live API answering. */
function stubbedClient(answers: Record<string, string>): YouVersionClient {
  const client = new YouVersionClient({ apiKey: 'test-key', baseUrl: 'https://example.invalid' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client as any).fetchVerse = async (reference: string, languageTag: string) => {
    const text = answers[reference];
    return text ? { reference, text, languageTag } : null;
  };
  return client;
}

describe('Scripture is the only way text enters the engine', () => {
  it('goes mute when there is no key and no pack, rather than inventing a line', async () => {
    const scripture = new Scripture(unconfigured()); // no pack at all
    expect(scripture.isConfigured).toBe(false);
    expect(await scripture.line('GEN.3.4')).toBeNull();
    expect(await scripture.line('MAT.4.6')).toBeNull();
  });

  it('serves the live text when the API answers, and says so', async () => {
    const scripture = new Scripture(
      stubbedClient({ 'GEN.3.4': 'Vous ne mourrez point.' }),
      { pack: PUBLIC_DOMAIN_PACK },
    );
    const line = await scripture.line('GEN.3.4');
    expect(line?.source).toBe('live');
    expect(line?.text).toBe('Vous ne mourrez point.');
    expect(scripture.servedLive).toBe(1);
  });

  it('falls back to the public domain pack when the network fails, and never pretends it was live', async () => {
    const scripture = new Scripture(unconfigured(), { pack: PUBLIC_DOMAIN_PACK });
    const line = await scripture.line('GEN.3.4');
    expect(line?.source).toBe('pack');
    expect(line?.text).toContain('mourrez');
    expect(scripture.servedLive).toBe(0);
  });

  it('serves the player their own language', async () => {
    const scripture = new Scripture(unconfigured(), { pack: PUBLIC_DOMAIN_PACK });
    const fr = await scripture.line('RUT.1.16', 'fra');
    const en = await scripture.line('RUT.1.16', 'eng');
    expect(fr?.text).toContain('Ou tu iras');
    expect(en?.text).toContain('Whither thou goest');
  });

  it('asks the API once per reference and reuses the answer afterwards', async () => {
    const scripture = new Scripture(stubbedClient({ 'JON.1.3': 'Jonas se leva pour fuir.' }));
    await scripture.line('JON.1.3');
    await scripture.line('JON.1.3');
    await scripture.line('JON.1.3');
    expect(scripture.servedLive).toBe(1);
  });
});

describe('the library holds no Scripture of its own', () => {
  it('stores references only, never a verse, so removing the API removes the text', async () => {
    const mute = new Scripture(unconfigured());
    const refs = LIBRARY.flatMap((arc) => arc.nodes.flatMap((n) => n.transitions.map((t) => t.because)));
    expect(refs.length).toBeGreaterThan(60);

    const spoken = await mute.lines(refs);
    expect(spoken).toHaveLength(0); // every single character is silent
  });

  it('every deed in the relation graph also resolves through the same door', async () => {
    const mute = new Scripture(unconfigured());
    const spoken = await mute.lines(Object.values(DEED_SOURCE));
    expect(spoken).toHaveLength(0);
  });

  it('the safety pack covers references the library actually uses', async () => {
    const scripture = new Scripture(unconfigured(), { pack: PUBLIC_DOMAIN_PACK });
    const used = new Set(
      LIBRARY.flatMap((arc) => arc.nodes.flatMap((n) => n.transitions.map((t) => t.because))),
    );
    const covered = Object.keys(PUBLIC_DOMAIN_PACK).filter((ref) => used.has(ref));
    expect(covered.length).toBeGreaterThan(0);

    for (const ref of covered) {
      const line = await scripture.line(ref);
      expect(line?.text.length ?? 0).toBeGreaterThan(10);
    }
  });
});
