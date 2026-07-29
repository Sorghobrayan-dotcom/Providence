import './editor.css';
import { Actor, blankWorld } from '../providence/Actor';
import { LIBRARY, RELATIONSHIP_ARCS } from '../providence/arcs';
import { INTERVENTION_ARCS } from '../providence/arcs2';
import { ADVERSARY_ARCS, FURTHER_ARCS } from '../providence/adversaries';
import { PUBLIC_DOMAIN_PACK, Scripture } from '../providence/Scripture';
import { YouVersionClient } from '../api/YouVersionClient';
import type { Arc, Directive, WorldView } from '../providence/types';
import { Stage3D } from './Stage3D';

/**
 * The Providence editor.
 *
 * This is not a mock-up of the library: it imports and runs it. Every state
 * change in the console below came out of the same Actor class the tests
 * exercise, and every verse came out of the same Scripture resolver, so what a
 * viewer sees on screen is the product and not a picture of it.
 */

type World = Omit<WorldView, 'timeInNode'>;

const FLAGS: readonly { key: keyof World; label: string }[] = [
  { key: 'underThreat', label: 'under threat' },
  { key: 'dangerAhead', label: 'danger ahead' },
  { key: 'atrocityImminent', label: 'atrocity imminent' },
  { key: 'playerSucceeding', label: 'player succeeding' },
  { key: 'playerReturning', label: 'player returning' },
  { key: 'playerSuffering', label: 'player suffering' },
  { key: 'observedByOthers', label: 'observed' },
  { key: 'pathBlocked', label: 'path blocked' },
  { key: 'underPressure', label: 'under pressure' },
  { key: 'playerDeceived', label: 'deceived' },
  { key: 'spoilUnguarded', label: 'spoil unguarded' },
];

const GROUPS: readonly { name: string; arcs: readonly Arc[] }[] = [
  { name: 'Relationship', arcs: RELATIONSHIP_ARCS },
  { name: 'Intervention', arcs: INTERVENTION_ARCS },
  { name: 'Adversary', arcs: ADVERSARY_ARCS },
  { name: 'Further', arcs: FURTHER_ARCS },
];

/* No credential is read here, and none exists in the bundle. The browser calls
   a same-origin path and the server attaches the App Key (see vite.config.ts). */
const scripture = new Scripture(new YouVersionClient({ baseUrl: '/scripture' }), {
  pack: PUBLIC_DOMAIN_PACK,
});

/* ------------------------------------------------------------------ */
/* Chrome                                                              */
/* ------------------------------------------------------------------ */

const root = document.getElementById('editor');
if (!root) throw new Error('providence.html is missing #editor.');

root.innerHTML = `
  <div class="toolbar">
    <div class="brand">
      <h1>Providence</h1>
      <span>moral physics layer &middot; ${LIBRARY.length} arcs loaded</span>
    </div>
    <div class="flags" id="flags"></div>
    <div class="api-state" id="api-state">scripture: checking</div>
  </div>

  <aside class="dock library">
    <div class="dock-title">Behaviour library</div>
    <div class="dock-body" id="library"></div>
  </aside>

  <main class="viewport">
    <canvas id="stage"></canvas>
    <div class="viewport-hint">drag to move the player &middot; toggles above drive the world</div>
  </main>

  <aside class="dock inspector">
    <div class="dock-title">Inspector</div>
    <div class="dock-body" id="inspector"></div>
  </aside>

  <section class="dock console">
    <div class="dock-title">Scripture console &middot; every transition states its source</div>
    <div class="console-body" id="console"></div>
  </section>
`;

const libraryEl = document.getElementById('library') as HTMLElement;
const inspectorEl = document.getElementById('inspector') as HTMLElement;
const consoleEl = document.getElementById('console') as HTMLElement;
const flagsEl = document.getElementById('flags') as HTMLElement;
const apiEl = document.getElementById('api-state') as HTMLElement;
const canvas = document.getElementById('stage') as HTMLCanvasElement;

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const world: World = { ...blankWorld(), distanceToPlayer: 8, errand: 'nineveh' };
const player = { x: 0.5, y: 0.62 };
const errand = { x: 0.845, y: 0.24 };

let arc: Arc = LIBRARY[0] as Arc;
let actor = new Actor(arc);
let position = { x: 0.28, y: 0.42 };
let clock = 0;

function selectArc(next: Arc): void {
  arc = next;
  actor = new Actor(next);
  position = { x: 0.28, y: 0.42 };
  clock = 0;
  consoleEl.replaceChildren();
  stage.setArc(next);
  renderLibrary();
  note(`loaded ${next.id}`, next.source);
}

/* ------------------------------------------------------------------ */
/* Library dock                                                        */
/* ------------------------------------------------------------------ */

function renderLibrary(): void {
  libraryEl.replaceChildren();
  for (const group of GROUPS) {
    const label = document.createElement('div');
    label.className = 'group-label';
    label.textContent = `${group.name} (${group.arcs.length})`;
    libraryEl.appendChild(label);

    for (const a of group.arcs) {
      const item = document.createElement('button');
      item.className = 'arc-item';
      item.type = 'button';
      item.setAttribute('aria-current', String(a.id === arc.id));
      const label2 = document.createElement('span');
      label2.className = 'label';
      label2.textContent = a.label;
      const id = document.createElement('span');
      id.className = 'id';
      id.textContent = a.id;
      item.append(label2, id);
      item.addEventListener('click', () => selectArc(a));
      libraryEl.appendChild(item);
    }
  }
}

/* ------------------------------------------------------------------ */
/* World flags                                                         */
/* ------------------------------------------------------------------ */

for (const flag of FLAGS) {
  const button = document.createElement('button');
  button.className = 'flag';
  button.type = 'button';
  button.textContent = flag.label;
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    const next = !(world[flag.key] as boolean);
    (world[flag.key] as boolean) = next;
    button.setAttribute('aria-pressed', String(next));
  });
  flagsEl.appendChild(button);
}

// the judge and the widow both need a counter, so give the toolbar one
const asked = document.createElement('button');
asked.className = 'flag';
asked.type = 'button';
const renderAsked = (): void => {
  asked.textContent = `ask again (${world.requestsMade})`;
};
asked.addEventListener('click', () => {
  world.requestsMade += 1;
  renderAsked();
});
renderAsked();
flagsEl.appendChild(asked);

const kind = document.createElement('button');
kind.className = 'flag';
kind.type = 'button';
const renderKind = (): void => {
  kind.textContent = `show kindness (${world.kindnessesWitnessed})`;
};
kind.addEventListener('click', () => {
  world.kindnessesWitnessed += 1;
  renderKind();
});
renderKind();
flagsEl.appendChild(kind);

/* ------------------------------------------------------------------ */
/* Console                                                             */
/* ------------------------------------------------------------------ */

function stamp(): string {
  const s = Math.floor(clock);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function row(who: string, what: string, ref: string): HTMLElement {
  const entry = document.createElement('div');
  entry.className = 'entry';
  for (const [cls, text] of [['t', stamp()], ['who', who], ['what', what], ['ref', ref]] as const) {
    const cell = document.createElement('span');
    cell.className = cls;
    cell.textContent = text;
    entry.appendChild(cell);
  }
  consoleEl.prepend(entry);
  while (consoleEl.children.length > 60) consoleEl.lastChild?.remove();
  return entry;
}

function note(what: string, ref: string): void {
  row('editor', what, ref);
}

/** Show the transition, then hang the resolved verse under it. */
async function report(who: string, what: string, ref: string): Promise<void> {
  const entry = row(who, what, ref);
  const line = await scripture.line(ref);

  if (!line) {
    // no key and nothing in the pack: the character has nothing to say, and we
    // refuse to invent something for it
    const mute = document.createElement('div');
    mute.className = 'mute';
    mute.textContent = `${ref} unavailable — no API key and not in the offline pack. The character stays silent.`;
    entry.insertAdjacentElement('afterend', mute);
    return;
  }

  const verse = document.createElement('div');
  verse.className = 'verse';
  verse.textContent = `« ${line.text} »`;
  const src = document.createElement('span');
  src.className = 'src';
  src.textContent = line.source === 'live' ? 'youversion, live' : 'offline pack';
  verse.appendChild(src);
  entry.appendChild(verse);
}

function refreshApiState(): void {
  const configured = scripture.isConfigured;
  apiEl.className = `api-state ${configured ? (scripture.servedLive > 0 ? 'live' : 'pack') : 'absent'}`;
  apiEl.textContent = configured
    ? `youversion: key present · ${scripture.servedLive} served live`
    : 'youversion: no key · offline pack only';
}

/* ------------------------------------------------------------------ */
/* Inspector                                                           */
/* ------------------------------------------------------------------ */

function meter(name: string, value: number): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'meter';
  const label = document.createElement('span');
  label.className = 'meter-name';
  label.textContent = name;
  const track = document.createElement('span');
  track.className = 'meter-track';
  const fill = document.createElement('span');
  fill.className = 'meter-fill';
  fill.style.width = `${Math.round(value * 100)}%`;
  track.appendChild(fill);
  const num = document.createElement('span');
  num.className = 'meter-num';
  num.textContent = value.toFixed(2);
  wrap.append(label, track, num);
  return wrap;
}

function field(name: string, build: (host: HTMLElement) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const label = document.createElement('span');
  label.className = 'field-name';
  label.textContent = name;
  wrap.appendChild(label);
  build(wrap);
  return wrap;
}

function renderInspector(): void {
  const d = actor.directive;
  const frag = document.createDocumentFragment();

  frag.appendChild(field('arc', (h) => {
    const v = document.createElement('div');
    v.className = 'field-value';
    v.textContent = `${arc.label}  ·  ${arc.source}`;
    h.appendChild(v);
  }));

  frag.appendChild(field('solves', (h) => {
    const v = document.createElement('div');
    v.className = 'solves';
    v.textContent = arc.solves;
    h.appendChild(v);
  }));

  frag.appendChild(field('state', (h) => {
    const v = document.createElement('div');
    v.className = 'field-value';
    v.textContent = actor.state;
    h.appendChild(v);
  }));

  frag.appendChild(field('disposition', (h) => {
    h.appendChild(meter('trust', actor.disposition.trust));
    h.appendChild(meter('fear', actor.disposition.fear));
    h.appendChild(meter('resolve', actor.disposition.resolve));
  }));

  frag.appendChild(field('directive', (h) => {
    const v = document.createElement('div');
    v.className = 'field-value';
    v.textContent = `${d.move} / ${d.posture}`;
    h.appendChild(v);

    const flags: (keyof Directive)[] = [
      'companion', 'refusing', 'blocking', 'overridesInput',
      'hostile', 'offering', 'suppressesParty', 'subverting',
    ];
    for (const f of flags) {
      const tag = document.createElement('span');
      tag.className = `tag${d[f] ? ' on' : ''}`;
      tag.textContent = String(f);
      h.appendChild(tag);
    }
    if (d.effectOnPlayer) {
      const tag = document.createElement('span');
      tag.className = 'tag on';
      tag.textContent = d.effectOnPlayer;
      h.appendChild(tag);
    }
  }));

  inspectorEl.replaceChildren(frag);
}

/* ------------------------------------------------------------------ */
/* Viewport                                                            */
/* ------------------------------------------------------------------ */

const stage = new Stage3D(canvas);

let dragging = false;
const toLocal = (e: PointerEvent): { x: number; y: number } => {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
};
canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  canvas.setPointerCapture(e.pointerId);
  Object.assign(player, toLocal(e));
});
canvas.addEventListener('pointermove', (e) => {
  if (dragging) Object.assign(player, toLocal(e));
});
canvas.addEventListener('pointerup', () => {
  dragging = false;
});

/** Move the actor according to the directive the library returned. */
function applyDirective(dt: number): void {
  const speed = 0.16 * dt;
  const target =
    actor.directive.move === 'toward-player' ? player :
    actor.directive.move === 'away-from-player' ? { x: 2 * position.x - player.x, y: 2 * position.y - player.y } :
    actor.directive.move === 'toward-errand' ? errand :
    actor.directive.move === 'away-from-errand' ? { x: 2 * position.x - errand.x, y: 2 * position.y - errand.y } :
    null;

  if (target) {
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    const len = Math.hypot(dx, dy) || 1;
    position.x = Math.max(0.04, Math.min(0.96, position.x + (dx / len) * speed));
    position.y = Math.max(0.06, Math.min(0.94, position.y + (dy / len) * speed));
  }
}

/* ------------------------------------------------------------------ */
/* Loop                                                                */
/* ------------------------------------------------------------------ */

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  clock += dt;

  world.distanceToPlayer = Math.hypot(player.x - position.x, player.y - position.y) * 40;
  world.hasLethalAdvantage = world.distanceToPlayer < 3;

  const event = actor.update(dt, world);
  if (event) void report(arc.id, `${event.from} → ${event.to}`, event.because);

  applyDirective(dt);
  stage.render(dt, actor.directive, player, position, errand);
  renderInspector();
  refreshApiState();
  requestAnimationFrame(frame);
}

renderLibrary();
stage.setArc(arc);
note('providence editor ready', 'GEN.1.1');
requestAnimationFrame(frame);
