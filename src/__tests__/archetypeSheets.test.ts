import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIBRARY, RELATIONSHIP_ARCS } from '../providence/arcs';
import { INTERVENTION_ARCS } from '../providence/arcs2';
import { ADVERSARY_ARCS, FURTHER_ARCS } from '../providence/adversaries';
import { MOTIVATED_ARCS } from '../providence/motivated';
import { PROFILES } from '../providence/drives';
import { ATMOSPHERES } from '../providence/atmosphere';
import type { Arc } from '../providence/types';

/**
 * The archetype sheets are generated, not written.
 *
 * A hand-kept table of twenty four characters drifts from the code within a
 * week, and a document that disagrees with the thing it documents is worse than
 * no document. So this reads the library and emits docs/archetypes.md, and the
 * assertions below double as a check that every arc is fit to be published:
 * named, sourced, and with no state you cannot reach.
 */

const FAMILIES: readonly { name: string; blurb: string; arcs: readonly Arc[] }[] = [
  {
    name: 'Relationship',
    blurb: 'How the character stands toward the player.',
    arcs: RELATIONSHIP_ARCS,
  },
  {
    name: 'Intervention',
    blurb: 'Something done to the player’s own course of action, wanted or not.',
    arcs: INTERVENTION_ARCS,
  },
  {
    name: 'Adversary',
    blurb: 'Danger a health bar cannot model. Most of these never fight.',
    arcs: ADVERSARY_ARCS,
  },
  {
    name: 'Further',
    blurb: 'Ordinary problems: occlusion, remote orders, privacy, theft from the pool.',
    arcs: FURTHER_ARCS,
  },
  {
    name: 'Motivated',
    blurb: 'Transitions chosen by pull rather than by order. Same room, opposite behaviour.',
    arcs: MOTIVATED_ARCS,
  },
];

function sheet(arc: Arc): string {
  const lines: string[] = [];
  lines.push(`### ${arc.label}  \`${arc.id}\``);
  lines.push('');
  lines.push(`*${arc.solves}*`);
  lines.push('');
  lines.push(`Drawn from ${arc.source}. Opens in \`${arc.initial}\`.`);
  lines.push('');
  lines.push(
    `Starting disposition: trust ${arc.start.trust}, fear ${arc.start.fear}, resolve ${arc.start.resolve}.`,
  );
  lines.push('');

  const terminal = arc.nodes.filter((n) => n.transitions.length === 0).map((n) => n.id);
  lines.push('| state | intends | drifts | goes to |');
  lines.push('| --- | --- | --- | --- |');
  for (const node of arc.nodes) {
    const flags = Object.entries(node.directive)
      .filter(([k, v]) => v === true && k !== 'move' && k !== 'posture')
      .map(([k]) => k);
    const intends = `${node.directive.move} · ${node.directive.posture}${flags.length ? ` · ${flags.join(', ')}` : ''}`;
    const drift = node.drift
      ? Object.entries(node.drift)
          .map(([k, v]) => `${k} ${(v as number) > 0 ? '+' : ''}${v}/s`)
          .join(', ')
      : '—';
    const goes = node.transitions.length
      ? node.transitions.map((t) => `\`${t.to}\` (${t.because})`).join('<br>')
      : '*end*';
    lines.push(`| \`${node.id}\` | ${intends} | ${drift} | ${goes} |`);
  }
  lines.push('');
  if (terminal.length) lines.push(`Ends in ${terminal.map((t) => `\`${t}\``).join(', ')}.`);
  lines.push('');
  return lines.join('\n');
}

function document(): string {
  const out: string[] = [];
  out.push('# The archetypes');
  out.push('');
  out.push(
    'Generated from the library by `src/__tests__/archetypeSheets.test.ts`. Do not edit by hand: a table\nkept by hand drifts from the code, and a sheet that disagrees with the thing it describes is worse\nthan none.',
  );
  out.push('');
  out.push(`${LIBRARY.length} arcs, ${PROFILES.length} drive profiles, ${ATMOSPHERES.length} atmospheres.`);
  out.push('');
  out.push('Every transition carries the passage it comes from and no text. `Scripture.ts` resolves those\nreferences at runtime through the YouVersion Platform API.');
  out.push('');
  out.push('---');
  out.push('');

  for (const family of FAMILIES) {
    out.push(`## ${family.name}`);
    out.push('');
    out.push(family.blurb);
    out.push('');
    for (const arc of family.arcs) out.push(sheet(arc));
    out.push('---');
    out.push('');
  }

  out.push('## Drive profiles');
  out.push('');
  out.push('Four layers each: what breaks the normal state, what it does first, where it goes if the strain\nnever lets up, and what brings it back. The last one is the layer games skip.');
  out.push('');
  for (const p of PROFILES) {
    out.push(`### ${p.label}  \`${p.id}\`  ·  ${p.source}`);
    out.push('');
    const drives = Object.entries(p.drives)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join(' · ');
    out.push(`Wants: ${drives}`);
    out.push('');
    out.push(`- **Trigger** ${p.trigger}`);
    out.push(`- **Breaking point** ${p.breakingPoint}`);
    out.push(`- **Resilience** ${p.resilience}`);
    out.push('');
  }

  out.push('---');
  out.push('');
  out.push('## Atmospheres');
  out.push('');
  out.push('A room does two things: it puts a floor under what the scene is already doing, and it leans on\ncertain wants. Where it also *weighs*, it presses on the disposition itself, which is how a place\nreaches every arc and not only the ones built on drives.');
  out.push('');
  out.push('| place | source | floor | leans on | weighs |');
  out.push('| --- | --- | --- | --- | --- |');
  for (const a of ATMOSPHERES) {
    const floor = Object.entries(a.ambient).map(([k, v]) => `${k} ${v}`).join(', ') || '—';
    const leans = Object.entries(a.leans).map(([k, v]) => `${k} ×${v}`).join(', ') || '—';
    const weighs = a.weighs
      ? Object.entries(a.weighs).map(([k, v]) => `${k} ${(v as number) > 0 ? '+' : ''}${v}/s`).join(', ')
      : '—';
    out.push(`| **${a.label}** | ${a.source} | ${floor} | ${leans} | ${weighs} |`);
  }
  out.push('');
  for (const a of ATMOSPHERES) out.push(`- **${a.label}** ${a.note}`);
  out.push('');
  return out.join('\n');
}

describe('every arc is fit to publish', () => {
  it('is named, sourced, and says what problem it solves', () => {
    for (const arc of LIBRARY) {
      expect(arc.label.length, arc.id).toBeGreaterThan(2);
      expect(arc.solves.length, arc.id).toBeGreaterThan(20);
      expect(arc.source, arc.id).toMatch(/^[A-Z0-9]{3}(\.\d+){0,2}$/);
    }
  });

  it('has no state you cannot reach and none you cannot name', () => {
    for (const arc of LIBRARY) {
      const ids = new Set(arc.nodes.map((n) => n.id));
      expect(ids.size, arc.id).toBe(arc.nodes.length);
      expect(ids.has(arc.initial), arc.id).toBe(true);
    }
  });

  it('appears in exactly one family', () => {
    const counted = FAMILIES.flatMap((f) => f.arcs.map((a) => a.id));
    expect(new Set(counted).size).toBe(counted.length);
    expect(counted.sort()).toEqual(LIBRARY.map((a) => a.id).sort());
  });

  it('writes the sheets out', () => {
    const text = document();
    writeFileSync(join(__dirname, '..', '..', 'docs', 'archetypes.md'), text, 'utf8');
    // spot-check one arc per family, plus both generated tables
    expect(text).toContain('balaams-donkey');
    expect(text).toContain('unjust-judge');
    expect(text).toContain('Drive profiles');
    expect(text).toContain('Atmospheres');
    expect(text.split('\n').length).toBeGreaterThan(200);
  });
});
