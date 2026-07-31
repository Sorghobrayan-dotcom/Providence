import './editor.css';
import { Actor, blankWorld } from '../providence/Actor';
import { LIBRARY, RELATIONSHIP_ARCS } from '../providence/arcs';
import { INTERVENTION_ARCS } from '../providence/arcs2';
import { ADVERSARY_ARCS, FURTHER_ARCS } from '../providence/adversaries';
import { PUBLIC_DOMAIN_PACK, Scripture } from '../providence/Scripture';
import { YouVersionClient } from '../api/YouVersionClient';
import type { Arc, Directive, WorldView } from '../providence/types';
import { Stage3D } from './Stage3D';
import { GracePanel, PlacePanel, RelationPanel } from './panels';
import { ScriptureConsole, type Channel } from './console';
import { brandTab, LivePlumbLine } from './logo';
import { approachFor, paceFor } from './Bearing';
import { GlooVoice } from '../api/GlooVoice';
import { covenantOf, NO_COVENANT } from '../providence/covenant';
import { gather, situationsIn, testimonyOf } from '../providence/testimony';
import { headingFor, spaceFor, wayFor } from '../providence/ways';
import type { Occasion } from '../providence/Utterance';
import { METRES_PER_UNIT } from './Stage3D';
import { memoryFor } from '../providence/memory';
import { cueFor, plainly } from './Cues';
import { Encounter, type EncounterState } from './Encounter';
import { verbsFor, type Verb } from './Verbs';

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
      <span id="mark"></span>
      <div class="brand-text">
        <h1>Providence</h1>
        <span>a plumb line for game worlds &middot; ${LIBRARY.length} arcs</span>
      </div>
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
    <button class="hail" type="button" id="hail" hidden>Parler <kbd>E</kbd></button>
    <div class="cue">
      <div class="cue-doing" id="cue-doing"></div>
      <div class="cue-next" id="cue-next"></div>
      <div class="menu" id="menu" hidden></div>
    </div>
  </main>

  <aside class="dock inspector">
    <div class="tabs" role="tablist">
      <button class="tab" type="button" role="tab" data-panel="soul" aria-selected="true">Soul</button>
      <button class="tab" type="button" role="tab" data-panel="relations" aria-selected="false">Relations</button>
      <button class="tab" type="button" role="tab" data-panel="place" aria-selected="false">Place</button>
      <button class="tab" type="button" role="tab" data-panel="grace" aria-selected="false">Grace</button>
    </div>
    <div class="dock-body" id="inspector"></div>
  </aside>
`;

const libraryEl = document.getElementById('library') as HTMLElement;
const inspectorEl = document.getElementById('inspector') as HTMLElement;

/* The console owns its own markup because it has real behaviour: a pointer
   lens, a legend that mutes channels, and copying. Building it in here would
   leave the queries and the DOM tangled together. */
const log = new ScriptureConsole();
root.appendChild(log.root);

/* The mark hangs on a damped pendulum and every event knocks it, so the header
   reads as an instrument: a quiet world leaves it dead vertical. */
const mark = new LivePlumbLine(24);
(document.getElementById('mark') as HTMLElement).replaceWith(mark.root);
brandTab('Providence — a plumb line for game worlds');
const flagsEl = document.getElementById('flags') as HTMLElement;
const apiEl = document.getElementById('api-state') as HTMLElement;
const canvas = document.getElementById('stage') as HTMLCanvasElement;

/* The graph, the places and grace were only ever visible in the tests, which
   made the tool look like a behaviour browser rather than the whole library. */
const relations = new RelationPanel();
const places = new PlacePanel();
const graceView = new GracePanel();
let panel: 'soul' | 'relations' | 'place' | 'grace' = 'soul';

for (const tab of document.querySelectorAll<HTMLButtonElement>('.tab')) {
  tab.addEventListener('click', () => {
    panel = tab.dataset['panel'] as typeof panel;
    for (const other of document.querySelectorAll('.tab')) {
      other.setAttribute('aria-selected', String(other === tab));
    }
    tab.blur();
  });
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const world: World = { ...blankWorld(), distanceToPlayer: 8, errand: 'nineveh' };

/* The voice. It holds no credential: it posts to a same-origin path and the
   dev plugin exchanges the client secret for a token out of the browser's
   reach. When it cannot answer, the character falls back to the passage. */
const voice = new GlooVoice();

/* Standing is read off the deed ledger, and only deeds change it, so this is
   recomputed when the graph reports rather than on every frame. */
function restate(): void {
  world.covenant = covenantOf(relations.graph);
}
const player = { x: 0.5, y: 0.62 };
const errand = { x: 0.845, y: 0.24 };

let arc: Arc = LIBRARY[0] as Arc;
let actor = new Actor(arc);

let position = { x: 0.28, y: 0.42 };
let clock = 0;

function selectArc(next: Arc): void {
  arc = next;
  /* Into the graph before the Actor is built, because the Actor reads its
     memory of the player out of it by this id. A character absent from the
     graph looks up a name that is not there and is handed the blank memory of
     a stranger, which is how betraying somebody used to leave everyone except
     Peter completely unmoved. Sworn to you if the arc is about standing toward
     the player; a stranger otherwise, since a covenant with Goliath is a claim
     the library never makes. */
  const sworn = RELATIONSHIP_ARCS.some((a) => a.id === next.id);
  relations.focus(next.id, sworn ? 'covenant' : 'stranger');
  restate();
  actor = new Actor(next, memoryFor(relations.graph, next.id));
  actor.standsIn(places.place);
  position = { x: 0.28, y: 0.42 };
  clock = 0;

  /* Whatever was being said, was being said to somebody else. The newcomer
     spawns inside the range that keeps a conversation open, so this cannot be
     left to distance to sort out. */
  encounter.forget();
  greeting = null;
  pending = null;
  /* Anything still in flight is being written for the man who just left. It is
     dropped on arrival by the speaker check inside greet(). */
  onTheWay = null;
  stage.setArc(next);
  renderLibrary();
  renderCue();
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

/* Asking and being kind are the two things the player *does*, as opposed to the
   eleven things the world merely is, so they are keys rather than another pair
   of grey pills in the same row. It also fixes the thing that made the tool
   unreadable: you walk up to someone and press S, which is what a person
   expects, instead of hunting a toolbar for a counter called "ask again". */
const asked = document.createElement('button');
asked.className = 'flag verb';
asked.type = 'button';
const renderAsked = (): void => {
  asked.innerHTML = `<kbd>S</kbd> ask <span class="count">${world.requestsMade}</span>`;
};
asked.addEventListener('click', () => {
  play(verbNamed('ask'));
  asked.blur();
});
renderAsked();
flagsEl.appendChild(asked);

const kind = document.createElement('button');
kind.className = 'flag verb';
kind.type = 'button';
const renderKind = (): void => {
  kind.innerHTML = `<kbd>K</kbd> show kindness <span class="count">${world.kindnessesWitnessed}</span>`;
};
kind.addEventListener('click', () => {
  play(verbNamed('kindness'));
  kind.blur();
});
renderKind();
flagsEl.appendChild(kind);

window.addEventListener('keydown', (e) => {
  // the console has a search box, and a viewer typing "steadfast" into it is
  // not asking anybody for anything
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  const key = e.key.toLowerCase();
  if (key === 's') play(verbNamed('ask'));
  else if (key === 'k') play(verbNamed('kindness'));
  else if (key === 'e') speakTo();
  else if (key === 'escape') breakOff();
});

/** The gesture by that name, aimed at whoever is standing there now. */
function verbNamed(id: string): Verb {
  return verbsFor(arc, actor.state).find((v) => v.id === id) as Verb;
}

/**
 * The player does something to the man in front of him.
 *
 * One road for all of it — the two keys, the two toolbar buttons and the menu —
 * so that asking from a keyboard and asking inside a conversation are the same
 * event, reach the engine the same way, and are answered the same way.
 */
function play(verb: Verb): void {
  const said = verb.apply({ world, graph: relations.graph, who: arc.id });
  renderAsked();
  renderKind();

  if (verb.kind === 'deed') {
    /* A deed moves where the player stands before the Law, and every arc reads
       that. The relation panel does this for its own buttons; a deed committed
       from the menu has to do it too, or the graph and the standing drift apart
       and the character answers to a record that is one deed out of date. */
    restate();
    relations.render();
    void report('graph', 'graph', said, verb.because);
  } else {
    note(`${said}, from ${world.distanceToPlayer.toFixed(1)} m`, verb.because);
  }

  /* Armed only for what a man can actually answer. If nothing in him gives way
     within the second, he answers anyway — and that silence, where a refusal
     belonged, was the whole of what made this look like an empty world. */
  pending = verb.told === undefined ? null : { told: verb.told, node: actor.state, at: clock };
}

/* ------------------------------------------------------------------ */
/* Console                                                             */
/* ------------------------------------------------------------------ */

/** Write a line, hang the resolved verse under it, and let the character speak. */
async function report(
  channel: Channel, who: string, what: string, ref: string, occasion?: Omit<Occasion, 'passage'>,
): Promise<void> {
  const entry = log.write(channel, who, what, ref);
  // a soul acting is the heaviest thing that happens, so it knocks the mark hardest
  mark.nudge(channel === 'editor' ? 0.22 : 0.55);

  const line = await scripture.line(ref);
  entry.verse(line);

  /* Only the soul channel speaks aloud: grace and the graph are the engine
     reporting, not anyone talking. */
  if (channel !== 'arc') return;

  /* His own words first, generated from the structure — this arc, this node,
     what just changed, how he is holding himself, what he carries, and who is
     asking. The passage goes along as the reason, never as a script.

     If Gloo cannot answer, the plate shows the passage instead, marked as
     scripture rather than dressed up as dialogue. And if Scripture cannot be
     served either, he says nothing at all: silence is the correct output, an
     invented line never is. */
  if (occasion) {
    /* Generation takes about four seconds against the live API, which is long
       enough for the character to have changed his mind twice. Remember who is
       speaking and from where, and drop the answer if either moved on: a line
       written for a state he has left is worse than no line at all. */
    const speaker = actor;
    const spokenFrom = occasion.node;

    // spread the passage only when there is one: an explicit `undefined` is
    // not the same as an absent optional under exactOptionalPropertyTypes
    const spoken = await voice.speak(line ? { ...occasion, passage: line.text } : occasion);
    if (actor !== speaker || actor.state !== spokenFrom) return;

    if (spoken) {
      stage.say(spoken, ref, 'utterance');
      return;
    }
  }
  if (line) stage.say(line.text, line.reference, 'scripture');
}

function note(what: string, ref: string): void {
  log.write('editor', 'editor', what, ref);
  mark.nudge(0.22);
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

/* ------------------------------------------------------------------ */
/* Cue                                                                 */
/* ------------------------------------------------------------------ */

const cueDoingEl = document.getElementById('cue-doing') as HTMLElement;
const cueNextEl = document.getElementById('cue-next') as HTMLElement;
let cueShown = '';

/** Mark up the controls a cue names, so the eye finds them before the sentence. */
function markControls(instruction: string): string {
  const escaped = instruction.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
  return escaped
    .replace(/\b(S|K)\b/g, '<kbd>$1</kbd>')
    .replace(
      /\b(under threat|danger ahead|atrocity imminent|player returning|player succeeding|player suffering|under pressure|path blocked|spoil unguarded|observed|deceived|Relations|Place|Grace)\b/g,
      '<b>$1</b>',
    );
}

function renderCue(): void {
  const cue = cueFor(arc.id, actor.state, actor.directive);
  const stamp = `${cue.doing} ${cue.next}`;
  if (stamp === cueShown) return;
  cueShown = stamp;
  cueDoingEl.textContent = cue.doing;
  cueNextEl.innerHTML = markControls(cue.next);
}

/* ------------------------------------------------------------------ */
/* The encounter                                                       */
/* ------------------------------------------------------------------ */

/**
 * Walking up to somebody and talking to them.
 *
 * Before this there was no such thing as addressing a person: there were two
 * keys that moved two counters in the world, and they applied to whoever was
 * loaded, from wherever you happened to be standing. Nothing that came back
 * could read as him answering *you*, and when a gesture moved nothing in him he
 * said nothing at all — which is indistinguishable from an empty world, though
 * what had actually happened was a refusal.
 *
 * `Encounter` holds the rules and is asserted without a DOM. This is the part
 * that draws them.
 */
const hailEl = document.getElementById('hail') as HTMLButtonElement;
const menuEl = document.getElementById('menu') as HTMLElement;
const encounter = new Encounter();

/** His opening line, bought on the approach so the walk pays for the latency. */
let greeting: { arcId: string; node: string; line: string | null } | null = null;
/** A gesture waiting to see whether anything in him gives way. */
let pending: { told: string; node: string; at: number } | null = null;

/** How long he is given to move before he has to answer instead. */
const ANSWER_AFTER = 1;

/** Who is standing there, how, and before whom: the structure the voice reads. */
const facing = () => ({
  arc,
  node: actor.state,
  directive: actor.directive,
  disposition: { ...actor.disposition },
  standing: actor.bears,
  covenant: world.covenant ?? NO_COVENANT,
  reference: arc.source,
});

/**
 * What he says, or — when nothing could be generated — what he is visibly
 * doing, told as narration and set apart from both speech and Scripture. The
 * one thing forbidden here is putting words in his mouth to fill the gap.
 */
function utter(line: string | null): void {
  if (line) stage.say(line, arc.source, 'utterance');
  else stage.say(plainly(actor.directive), arc.source, 'narration');
}

/** One already being written, so hailing mid-flight does not buy a second. */
let onTheWay: { wanted: boolean } | null = null;

/** Buy his opening line. `now` says whether it is wanted on screen or only kept. */
async function greet(now: boolean): Promise<void> {
  if (onTheWay !== null) {
    /* Crossing the approach mark and hailing are two separate triggers, and
       four seconds apart at most: without this, walking up and speaking buys
       the same opening line twice and shows whichever lands second. */
    if (now) onTheWay.wanted = true;
    return;
  }

  const speaker = actor;
  const node = actor.state;
  onTheWay = { wanted: now };

  const line = await voice.speak({ ...facing(), moment: 'greeting' });
  const wanted = onTheWay?.wanted === true;
  onTheWay = null;

  if (actor !== speaker) return;
  greeting = { arcId: arc.id, node, line };
  if (wanted && actor.state === node) utter(line);
}

/**
 * He was asked something and nothing in him moved. He answers that.
 *
 * Deliberately not through `report`: there is no transition here and so no
 * passage behind it, and resolving one would hang a verse under a line no verse
 * produced. He speaks from what he is, and cites nothing.
 */
async function answer(told: string): Promise<void> {
  const speaker = actor;
  const node = actor.state;
  // no pronoun: seven of the twenty four are women and one of them is an ass
  log.write('arc', arc.id, 'asked, and nothing moved', arc.source);
  mark.nudge(0.55);

  const line = await voice.speak({ ...facing(), moment: 'answered-request', asked: told });
  if (actor !== speaker || actor.state !== node) return;
  utter(line);
}

function speakTo(): void {
  if (!encounter.hail()) return;
  renderMenu();
  if (greeting !== null && greeting.arcId === arc.id && greeting.node === actor.state) {
    utter(greeting.line);
  } else {
    void greet(true);
  }
  note(`you spoke to ${arc.id}`, 'JHN.4.7');
}

function breakOff(): void {
  if (encounter.dismiss()) note('you stopped asking', 'ECC.3.7');
}

function renderMenu(): void {
  menuEl.replaceChildren();
  for (const verb of verbsFor(arc, actor.state)) {
    const button = document.createElement('button');
    button.className = 'choice';
    button.type = 'button';
    button.textContent = verb.label;
    button.addEventListener('click', () => {
      play(verb);
      /* Leaving is the only one that closes it. Ruth wants two kindnesses and
         the judge wants six asks, and a menu that shuts on every click puts
         both of them out of reach. */
      if (verb.kind === 'leave') breakOff();
      button.blur();
    });
    menuEl.appendChild(button);
  }
}

/** The offer over his head, or the menu standing in for the cue. */
function renderEncounter(state: EncounterState): void {
  const open = state === 'open';
  menuEl.hidden = !open;
  cueDoingEl.hidden = open;
  cueNextEl.hidden = open;

  hailEl.hidden = state !== 'near';
  if (state !== 'near') return;

  // pinned to the man it concerns, rather than being one more control in a row
  const head = stage.headAt();
  hailEl.style.left = `${(head.x * 100).toFixed(2)}%`;
  hailEl.style.top = `${(head.y * 100).toFixed(2)}%`;
}

hailEl.addEventListener('click', () => {
  speakTo();
  hailEl.blur();
});

function renderInspector(): void {
  if (panel === 'relations') {
    if (inspectorEl.firstChild !== relations.root) inspectorEl.replaceChildren(relations.root);
    return;
  }
  if (panel === 'place') {
    if (inspectorEl.firstChild !== places.root) inspectorEl.replaceChildren(places.root);
    return;
  }
  if (panel === 'grace') {
    if (inspectorEl.firstChild !== graceView.root) inspectorEl.replaceChildren(graceView.root);
    return;
  }

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

    /* The node id is the engine's word for it. `shrinking` is precise and it
       tells a first-time reader nothing, so the same thing is said twice. */
    const said = document.createElement('div');
    said.className = 'solves';
    said.textContent = plainly(actor.directive);
    h.appendChild(said);
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
  // where it goes is the library's call; how urgently it gets there is what it
  // feels about going, which is the whole point of the disposition
  const speed = 0.16 * dt * paceFor(actor.disposition, actor.directive.move, clock);
  const target =
    actor.directive.move === 'toward-player' ? player :
    actor.directive.move === 'away-from-player' ? { x: 2 * position.x - player.x, y: 2 * position.y - player.y } :
    actor.directive.move === 'toward-errand' ? errand :
    actor.directive.move === 'away-from-errand' ? { x: 2 * position.x - errand.x, y: 2 * position.y - errand.y } :
    null;

  if (!target) return;

  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const gap = Math.hypot(dx, dy);
  if (gap < 1e-6) return;

  /* Stop at arm's length instead of at the other body's exact coordinates.
     Without this the actor walks clean through the player and the two of them
     render as a single figure — which is what was on screen. How far out it
     stops is the character's business: a companion who trusts you comes to your
     shoulder, one who does not keeps the length of a room. */
  /* How it goes, as distinct from where. The directive already picked the
     destination; the way bends the line taken to it and straightens on arrival,
     so a serpent and a giant close the same gap differently. Most arcs have no
     way and this is the identity. */
  const way = wayFor(arc.id);

  const keep = spaceFor(way, approachFor(actor.disposition, actor.directive.move)) / METRES_PER_UNIT;
  const step = Math.min(speed, Math.max(0, gap - keep));
  if (step <= 0) return;

  const heading = headingFor(way, Math.atan2(dy, dx), clock, gap * METRES_PER_UNIT);
  position.x = Math.max(0.04, Math.min(0.96, position.x + Math.cos(heading) * step));
  position.y = Math.max(0.06, Math.min(0.94, position.y + Math.sin(heading) * step));
}

/* ------------------------------------------------------------------ */
/* Loop                                                                */
/* ------------------------------------------------------------------ */

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  clock += dt;

  /* Metres, on the same scale the renderer and Bearing use. This was a bare 40
     against a world that is 18 metres across, so the library saw every distance
     as more than twice what was on screen. The consequence was not cosmetic:
     Bearing stops a wary stranger 2.95 m away, which read as 6.5 to the arcs,
     and every node that opens at `distanceToPlayer < 3` was therefore
     unreachable. Characters could not be approached closely enough to answer,
     which is exactly how it felt. */
  world.distanceToPlayer =
    Math.hypot(player.x - position.x, player.y - position.y) * METRES_PER_UNIT;
  world.hasLethalAdvantage = world.distanceToPlayer < 3;

  const event = actor.update(dt, world);
  if (event) {
    /* Something in him gave way, so the transition speaks for him and whatever
       gesture was waiting on an answer has had one. */
    pending = null;
    void report('arc', arc.id, `${event.from} → ${event.to}`, event.because, {
      arc,
      node: event.to,
      from: event.from,
      // the directive of the node just entered, which is what he is doing as he speaks
      directive: actor.directive,
      disposition: { ...actor.disposition },
      standing: actor.bears,
      covenant: world.covenant ?? NO_COVENANT,
      reference: event.because,
    });
  } else if (pending !== null && clock - pending.at > ANSWER_AFTER) {
    /* A second has passed and nothing gave way. He is not indifferent, he is
       refusing, and until now the difference reached the player as silence. */
    const told = pending.told;
    pending = null;
    void answer(told);
  }

  /* Where the two of them stand toward each other, which is not the same
     question as where they stand on the ground. An open conversation does not
     survive him changing state: the soul does not wait for the menu. */
  const beat = encounter.observe({ metres: world.distanceToPlayer, moved: event !== null });
  if (beat.prepare) void greet(false);
  if (beat.ended !== null) {
    note(
      beat.ended === 'he-moved'
        ? 'the arc moved, and took the conversation with it'
        : 'walked off while you were still asking',
      'ECC.3.7',
    );
  }

  /* Grace watches how closed the situation is. Standing next to the player with
     nothing pressing is not desperate; being cornered by a hostile one is. */
  const cornered = actor.directive.hostile === true && world.distanceToPlayer < 4;
  const graceReport = graceView.grace.observe(cornered ? 0.95 : 0.2, dt);
  if (graceReport.outcome === 'given' || graceReport.outcome === 'withheld') {
    graceView.show(graceReport);
    if (graceReport.because) void report('grace', 'grace', graceReport.outcome, graceReport.because);
  }

  applyDirective(dt);

  /* What the world does about him. Distance is what keeps this legible: the sky
     answers the man you are standing next to, not the one across the map. */
  const apart = Math.hypot(position.x - player.x, position.y - player.y) * METRES_PER_UNIT;
  /* One sky, from everyone who has something to say about it: the man standing
     there, and the scene itself. gather() takes the furthest departure per
     channel, so a toggle cannot be washed out by a calm character. */
  const weather = gather([
    testimonyOf(arc.id, actor.disposition, actor.bears, apart),
    ...situationsIn(world as unknown as Record<string, unknown>),
  ]);

  stage.render(dt, actor.directive, actor.disposition, actor.bears, weather, player, position, errand);
  // after the render, because the offer is pinned to where his head just landed
  renderEncounter(beat.state);
  renderCue();
  renderInspector();
  refreshApiState();
  requestAnimationFrame(frame);
}

places.picked((place) => {
  actor.standsIn(place);
  note(`moved to ${place.label}`, place.source);
});
relations.reports((summary, because) => {
  restate();
  void report('graph', 'graph', summary, because);
});
/* Through the same door every other load goes through, so the character the
   editor opens on is bound into the graph like any other. Setting it up by hand
   here is how the first arc ended up being the one arc with no memory. */
selectArc(arc);
note('providence editor ready', 'GEN.1.1');
requestAnimationFrame(frame);
