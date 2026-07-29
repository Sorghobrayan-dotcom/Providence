import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PUBLIC_DOMAIN_PACK, Scripture } from '../providence/Scripture';
import { YouVersionClient } from '../api/YouVersionClient';
import { LIBRARY } from '../providence/arcs';
import { DEED_SOURCE } from '../providence/relations';
import { TABERNACLE } from '../providence/places';

/**
 * These are the load-bearing claims of the whole project, so they are asserted
 * rather than asserted about. If any of them breaks, the writeup is no longer
 * telling the truth and the submission should not go out.
 */

const ENGINE_DIR = join(__dirname, '..', 'providence');
/** Every engine file except the one whose entire job is to hold the safety net. */
const engineSources = readdirSync(ENGINE_DIR)
  .filter((f) => f.endsWith('.ts') && f !== 'Scripture.ts')
  .map((f) => ({ name: f, body: readFileSync(join(ENGINE_DIR, f), 'utf8') }));

describe('claim 1: without a source of Scripture, characters say nothing', () => {
  const unreachable = new YouVersionClient({ baseUrl: 'https://127.0.0.1:1/never' });

  it('returns nothing at all when there is no key and no pack', async () => {
    const mute = new Scripture(unreachable, { pack: {}, store: null });
    expect(await mute.line('JON.1.3')).toBeNull();
    expect(await mute.line('LUK.22.57')).toBeNull();
    expect(mute.servedLive).toBe(0);
  });

  it('never invents a line to fill the silence', async () => {
    const mute = new Scripture(unreachable, { pack: {}, store: null });
    const lines = await mute.lines(LIBRARY.flatMap((a) => a.nodes.flatMap((n) => n.transitions.map((t) => t.because))));
    expect(lines).toHaveLength(0);
  });

  it('falls back to the pack only when the pack actually holds the passage, and says so', async () => {
    const netted = new Scripture(unreachable, { pack: PUBLIC_DOMAIN_PACK, store: null });
    const known = await netted.line('GEN.3.4');
    expect(known?.source).toBe('pack'); // never mislabelled as live
    expect(await netted.line('OBA.1.1')).toBeNull();
  });
});

describe('claim 2: the engine holds references, never Scripture', () => {
  it('contains none of the verse text the pack carries', () => {
    for (const { name, body } of engineSources) {
      for (const [usfm, texts] of Object.entries(PUBLIC_DOMAIN_PACK)) {
        for (const variant of [texts.fra, texts.eng]) {
          // compare on a distinctive slice, so incidental words cannot trip it
          const fingerprint = variant.slice(20, 60);
          expect(body.includes(fingerprint), `${name} appears to embed ${usfm}`).toBe(false);
        }
      }
    }
  });

  it('cites every transition, deed and threshold by reference only', () => {
    const usfm = /^[A-Z0-9]{3}\.\d+(\.\d+)?$/;
    for (const arc of LIBRARY) {
      for (const node of arc.nodes) {
        for (const t of node.transitions) expect(t.because).toMatch(usfm);
      }
    }
    for (const ref of Object.values(DEED_SOURCE)) expect(ref).toMatch(usfm);
    for (const threshold of TABERNACLE) expect(threshold.source).toMatch(usfm);
  });

  it('reaches the platform through one door and one door only', () => {
    const offenders = engineSources.filter((f) => /fetch\(|XMLHttpRequest|axios/.test(f.body));
    expect(offenders.map((f) => f.name)).toEqual([]);
  });
});

describe('claim 3: no credential can reach the browser', () => {
  const clientSources = ['src/editor/main.ts', 'src/main.ts', 'src/providence', 'src/scenes']
    .flatMap((p) => {
      const full = join(__dirname, '..', '..', p);
      try {
        return readdirSync(full).filter((f) => f.endsWith('.ts')).map((f) => join(full, f));
      } catch {
        return [full];
      }
    })
    .map((f) => ({ name: f, body: readFileSync(f, 'utf8') }));

  it('reads no VITE_ prefixed credential anywhere, since Vite bundles those', () => {
    for (const { name, body } of clientSources) {
      const exposed = body.match(/VITE_[A-Z_]*(KEY|SECRET|TOKEN)/g) ?? [];
      expect(exposed, `${name} would ship a credential to the browser`).toEqual([]);
    }
  });
});

describe('claim 4: the cache spares the network without changing the answer', () => {
  it('serves a repeated reference without a second call', async () => {
    let calls = 0;
    const counting = {
      isConfigured: true,
      async fetchVerse(reference: string) {
        calls += 1;
        return { reference, text: 'once', languageTag: 'fra' as const };
      },
    } as unknown as YouVersionClient;

    const scripture = new Scripture(counting, { pack: {}, store: null });
    const first = await scripture.line('JON.1.3');
    const second = await scripture.line('JON.1.3');
    expect(calls).toBe(1);
    expect(second?.text).toBe(first?.text);
  });
});
