import { RelationGraph, type Bond, type Deed } from '../providence/relations';
import { Grace, type GraceReport } from '../providence/grace';
import { ATMOSPHERES, type Atmosphere } from '../providence/atmosphere';

/**
 * The three halves of Providence the editor could not previously show.
 *
 * Arcs were visible from the first version, which made the tool look like a
 * behaviour browser. The graph, the places and grace were only ever in the
 * tests, so the strongest parts of the library were invisible to anyone who did
 * not read the source. These panels fix that.
 */

const CAST = ['player', 'peter', 'his-brother', 'boaz'] as const;

/** Ring layout, so the graph reads the same on every redraw. */
function ringPositions(count: number, width: number, height: number): { x: number; y: number }[] {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.34;
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

export class RelationPanel {
  readonly root = document.createElement('div');
  readonly graph = new RelationGraph();
  private readonly svg: SVGSVGElement;
  private readonly ledgerEl = document.createElement('div');
  private onDeed: ((summary: string, because: string) => void) | null = null;

  constructor() {
    // a small household, so a deed has somewhere to propagate
    this.graph.bind('player', 'peter', 'covenant', 0.9);
    this.graph.bind('player', 'boaz', 'household', 0.5);
    this.graph.bind('peter', 'his-brother', 'kin', 0.9);
    this.graph.bind('boaz', 'his-brother', 'kin', 0.6);

    const holder = document.createElement('div');
    holder.className = 'graph';
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', '0 0 220 168');
    holder.appendChild(this.svg);

    const deeds = document.createElement('div');
    deeds.className = 'deeds';
    const offer: { label: string; deed: Deed }[] = [
      { label: 'betray peter', deed: { kind: 'betray', actor: 'player', toward: 'peter' } },
      { label: 'betray boaz', deed: { kind: 'betray', actor: 'player', toward: 'boaz' } },
      { label: 'lend to boaz', deed: { kind: 'lend', actor: 'player', toward: 'boaz', amount: 50 } },
      { label: 'redeem boaz', deed: { kind: 'redeem', actor: 'his-brother', toward: 'boaz' } },
      { label: 'bless peter', deed: { kind: 'bless', actor: 'player', toward: 'peter', amount: 10 } },
      { label: 'steal it back', deed: { kind: 'steal-blessing', actor: 'player', toward: 'peter' } },
      { label: 'forgive peter', deed: { kind: 'forgive', actor: 'player', toward: 'peter' } },
    ];
    for (const item of offer) {
      const button = document.createElement('button');
      button.className = 'deed';
      button.type = 'button';
      button.textContent = item.label;
      button.addEventListener('click', () => {
        const judgment = this.graph.commit(item.deed);
        const summary = judgment.refused
          ? `${item.deed.kind} refused: ${judgment.refused}`
          : `${item.deed.kind} weighed ${judgment.weight}${judgment.reached.length ? `, reached ${judgment.reached.join(', ')}` : ''}`;
        this.onDeed?.(summary, judgment.because);
        this.render();
        button.blur();
      });
      deeds.appendChild(button);
    }

    this.ledgerEl.className = 'ledger';
    this.root.append(holder, deeds, this.ledgerEl);
    this.render();
  }

  reports(listener: (summary: string, because: string) => void): void {
    this.onDeed = listener;
  }

  render(): void {
    const spots = ringPositions(CAST.length, 220, 168);
    this.svg.replaceChildren();

    // edges first, so the dots sit on top of them
    for (let i = 0; i < CAST.length; i++) {
      for (let j = i + 1; j < CAST.length; j++) {
        const a = CAST[i] as string;
        const b = CAST[j] as string;
        const relation = this.graph.relation(a, b);
        if (!relation) continue;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(spots[i]?.x));
        line.setAttribute('y1', String(spots[i]?.y));
        line.setAttribute('x2', String(spots[j]?.x));
        line.setAttribute('y2', String(spots[j]?.y));
        // a tie reduced to stranger with no strength left is a broken one
        const broken = relation.bond === 'stranger' && relation.strength === 0;
        line.setAttribute('class', `edge ${relation.bond as Bond}${broken ? ' broken' : ''}`);
        this.svg.appendChild(line);
      }
    }

    CAST.forEach((name, i) => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', String(spots[i]?.x));
      dot.setAttribute('cy', String(spots[i]?.y));
      dot.setAttribute('r', '7');
      dot.setAttribute('class', `node-dot${name === 'player' ? ' player' : ''}`);
      this.svg.appendChild(dot);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', String(spots[i]?.x));
      label.setAttribute('y', String((spots[i]?.y ?? 0) + 20));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'node-label');
      const debt = this.graph.debtOf(name);
      label.textContent = debt > 0 ? `${name} (owes ${debt})` : name;
      this.svg.appendChild(label);
    });

    this.ledgerEl.replaceChildren();
    for (const judgment of [...this.graph.ledger].reverse().slice(0, 6)) {
      const row = document.createElement('div');
      if (judgment.refused) {
        row.innerHTML = `<b>${judgment.deed}</b> <span class="w">refused</span> — ${judgment.refused}`;
      } else {
        const reached = judgment.reached.length ? ` · reached ${judgment.reached.join(', ')}` : '';
        row.innerHTML = `<b>${judgment.deed}</b> ${judgment.actor} → ${judgment.toward} · weight ${judgment.weight}${reached}`;
      }
      this.ledgerEl.appendChild(row);
    }
    if (this.graph.ledger.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'nothing has happened between them yet';
      this.ledgerEl.appendChild(empty);
    }
  }
}

export class PlacePanel {
  readonly root = document.createElement('div');
  private current: Atmosphere = ATMOSPHERES[0] as Atmosphere;
  private onPick: ((place: Atmosphere) => void) | null = null;
  private readonly noteEl = document.createElement('div');
  private readonly buttons: HTMLButtonElement[] = [];

  constructor() {
    const row = document.createElement('div');
    row.className = 'places';
    for (const place of ATMOSPHERES) {
      const button = document.createElement('button');
      button.className = 'place';
      button.type = 'button';
      button.textContent = place.label;
      button.setAttribute('aria-pressed', String(place.id === this.current.id));
      button.addEventListener('click', () => {
        this.current = place;
        for (const other of this.buttons) other.setAttribute('aria-pressed', String(other === button));
        this.renderNote();
        this.onPick?.(place);
        button.blur();
      });
      this.buttons.push(button);
      row.appendChild(button);
    }
    this.noteEl.className = 'place-note';
    this.root.append(row, this.noteEl);
    this.renderNote();
  }

  picked(listener: (place: Atmosphere) => void): void {
    this.onPick = listener;
  }

  get place(): Atmosphere {
    return this.current;
  }

  private renderNote(): void {
    const p = this.current;
    const floor = Object.entries(p.ambient).map(([k, v]) => `${k} ${v}`).join(', ') || 'nothing';
    const leans = Object.entries(p.leans).map(([k, v]) => `${k} ×${v}`).join(', ') || 'nothing';
    const weighs = p.weighs
      ? Object.entries(p.weighs).map(([k, v]) => `${k} ${(v as number) > 0 ? '+' : ''}${v}/s`).join(', ')
      : 'nothing';
    this.noteEl.innerHTML =
      `${p.note}.<br><br>floor: ${floor}<br>leans on: ${leans}<br>` +
      `<b>weighs on disposition:</b> ${weighs}<br><br>${p.source}`;
  }
}

export class GracePanel {
  readonly root = document.createElement('div');
  readonly grace = new Grace();
  private readonly stateEl = document.createElement('div');
  private readonly noteEl = document.createElement('div');

  constructor() {
    this.root.className = 'grace';
    this.stateEl.className = 'grace-state';
    this.noteEl.className = 'grace-note';
    this.root.append(this.stateEl, this.noteEl);
    this.show({ outcome: 'none' });
  }

  show(report: GraceReport): void {
    this.stateEl.className = `grace-state${report.outcome === 'given' ? ' given' : report.outcome === 'withheld' ? ' withheld' : ''}`;
    const label =
      report.outcome === 'given' ? 'given' :
      report.outcome === 'withheld' ? 'withheld' :
      report.outcome === 'watching' ? 'watching, no draw available' :
      'nothing closed enough to watch';
    this.stateEl.textContent = `${label}   ·   ${this.grace.answered}/${this.grace.episodesSeen} episodes answered`;

    this.noteEl.innerHTML =
      '<b>Uncallable.</b> No method here triggers it.<br>' +
      '<b>Unconfigurable.</b> Threshold, rate and refractory period are frozen.<br>' +
      '<b>Unearnable.</b> observe() receives desperation and a duration, and nothing about the player, so it cannot tell a saint from a monster.<br><br>' +
      'One draw per episode at 0.2, so four desperate moments in five receive nothing. See docs/grace.md.';
  }
}
