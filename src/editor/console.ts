import type { Line } from '../providence/Scripture';

/**
 * The Scripture console.
 *
 * Two kinds of thing land here and they must not look alike. What the machine
 * did is telemetry: small, monospaced, dim, countable. What Scripture says is a
 * text: set in a serif and left alone. The interface is monochrome, so that
 * distinction is carried by typeface rather than by a colour.
 *
 * Everything is set small on purpose. This is a readout you glance at while
 * driving the world with the other hand, not a page you sit down to read: it has
 * to catch the eye when something happens and otherwise stay out of the way.
 *
 * The controls are the ones that were always here — filters, a search, clear,
 * pin, copy. On top of them the stream answers to the pointer: rows near it come
 * up to full ink and the rest recede, which is the only way a dense monochrome
 * list gets depth. That part is presentation only. No entry is ever removed from
 * the document by the lens, so a reader without a pointer loses nothing.
 */

export type Channel = 'arc' | 'graph' | 'grace' | 'editor';

export interface Entry {
  readonly channel: Channel;
  readonly who: string;
  readonly what: string;
  readonly reference: string;
  readonly at: number;
}

const FILTERS: readonly { id: Channel | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'arc', label: 'Souls' },
  { id: 'graph', label: 'Relations' },
  { id: 'grace', label: 'Grace' },
];

/** Above this the stream is scrollback nobody reads and layout starts to cost. */
const CAP = 120;

/** How far the lens reaches, in pixels. About three telemetry rows. */
const REACH = 132;

interface Row {
  readonly entry: Entry;
  readonly element: HTMLElement;
  pinned: boolean;
}

export class ScriptureConsole {
  readonly root: HTMLElement;

  private readonly stream: HTMLElement;
  private readonly pinned: HTMLElement;
  private readonly search: HTMLInputElement;
  private readonly countEl: HTMLElement;
  private readonly buttons = new Map<Channel | 'all', HTMLButtonElement>();
  private readonly tallies = new Map<Channel | 'all', HTMLElement>();

  private rows: Row[] = [];
  private filter: Channel | 'all' = 'all';
  private query = '';
  private seq = 0;
  private verses = 0;

  private pointerY: number | null = null;
  private frame = 0;

  constructor() {
    this.root = document.createElement('section');
    this.root.className = 'dock console';
    this.root.innerHTML = `
      <div class="console-head">
        <span class="console-title">Scripture console</span>
        <div class="filters" role="group" aria-label="Filter the log"></div>
        <label class="search">
          <span class="sr">Search the log</span>
          <input type="search" placeholder="search" spellcheck="false" />
        </label>
        <span class="console-count" aria-live="polite"></span>
        <button class="ghost" type="button" data-act="clear">Clear</button>
      </div>
      <div class="pinned" hidden></div>
      <div class="stream" tabindex="0" role="log"></div>
    `;

    this.stream = this.root.querySelector('.stream') as HTMLElement;
    this.pinned = this.root.querySelector('.pinned') as HTMLElement;
    this.search = this.root.querySelector('input') as HTMLInputElement;
    this.countEl = this.root.querySelector('.console-count') as HTMLElement;

    const filterHost = this.root.querySelector('.filters') as HTMLElement;
    for (const f of FILTERS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.setAttribute('aria-pressed', String(f.id === 'all'));
      // the count rides on the filter that already existed rather than adding
      // a second row of chrome to say the same thing
      button.innerHTML = `<span class="chip-label"></span><span class="chip-n">0</span>`;
      (button.querySelector('.chip-label') as HTMLElement).textContent = f.label;
      button.addEventListener('click', () => this.setFilter(f.id));
      this.buttons.set(f.id, button);
      this.tallies.set(f.id, button.querySelector('.chip-n') as HTMLElement);
      filterHost.appendChild(button);
    }

    this.search.addEventListener('input', () => {
      this.query = this.search.value.trim().toLowerCase();
      this.apply();
    });

    (this.root.querySelector('[data-act="clear"]') as HTMLElement).addEventListener('click', () => {
      for (const row of this.rows) if (!row.pinned) row.element.remove();
      this.rows = this.rows.filter((r) => r.pinned);
      this.verses = this.rows.filter((r) => r.element.querySelector('.verse')).length;
      this.apply();
    });

    this.stream.addEventListener('pointerenter', () => this.stream.classList.add('lit'));
    this.stream.addEventListener('pointermove', (event) => {
      this.pointerY = event.clientY;
      this.schedule();
    });
    this.stream.addEventListener('pointerleave', () => {
      this.stream.classList.remove('lit');
      this.pointerY = null;
      this.schedule();
    });
    // scrolling moves the rows under a stationary pointer, so the lens has to
    // follow the content and not only the mouse
    this.stream.addEventListener('scroll', () => {
      if (this.pointerY !== null) this.schedule();
    }, { passive: true });

    this.apply();
  }

  private setFilter(id: Channel | 'all'): void {
    this.filter = id;
    for (const [key, button] of this.buttons) {
      button.setAttribute('aria-pressed', String(key === id));
    }
    this.apply();
  }

  private visible(entry: Entry): boolean {
    if (this.filter !== 'all' && entry.channel !== this.filter) return false;
    if (!this.query) return true;
    const haystack = `${entry.who} ${entry.what} ${entry.reference}`.toLowerCase();
    return haystack.includes(this.query);
  }

  private apply(): void {
    const per = new Map<Channel | 'all', number>();
    let shown = 0;

    for (const row of this.rows) {
      const show = this.visible(row.entry);
      row.element.hidden = !show;
      if (show) shown += 1;
      per.set(row.entry.channel, (per.get(row.entry.channel) ?? 0) + 1);
    }
    per.set('all', this.rows.length);

    for (const [id, element] of this.tallies) element.textContent = String(per.get(id) ?? 0);

    const total = this.rows.length;
    const counted = shown === total ? `${total}` : `${shown} of ${total}`;
    this.countEl.textContent = this.verses === 0 ? counted : `${counted} · ${this.verses} spoken`;
    this.pinned.hidden = !this.rows.some((r) => r.pinned);

    if (this.pointerY !== null) this.schedule();
  }

  private schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.lens();
    });
  }

  /**
   * Set each row's distance from the pointer.
   *
   * Read every rectangle before writing a single property. Interleaving them
   * makes each write invalidate the next read, and the browser re-lays out the
   * whole stream once per row — the classic way to turn a cheap effect into a
   * dropped frame.
   */
  private lens(): void {
    const y = this.pointerY;

    if (y === null) {
      for (const row of this.rows) row.element.style.setProperty('--near', '1');
      return;
    }

    const box = this.stream.getBoundingClientRect();
    const near: number[] = [];

    for (const row of this.rows) {
      if (row.element.hidden) {
        near.push(0);
        continue;
      }
      const rect = row.element.getBoundingClientRect();
      if (rect.bottom < box.top || rect.top > box.bottom) {
        near.push(0);
        continue;
      }
      const distance = Math.abs(rect.top + rect.height / 2 - y);
      near.push(Math.max(0, 1 - distance / REACH));
    }

    for (let i = 0; i < this.rows.length; i += 1) {
      this.rows[i]?.element.style.setProperty('--near', (near[i] ?? 0).toFixed(3));
    }
  }

  /** Write a line. Returns a handle so the caller can hang a verse under it. */
  write(channel: Channel, who: string, what: string, reference: string): { verse(line: Line | null): void } {
    this.seq += 1;
    const entry: Entry = { channel, who, what, reference, at: this.seq };

    const element = document.createElement('article');
    element.className = 'line';
    element.dataset['channel'] = channel;
    element.style.setProperty('--near', this.pointerY === null ? '1' : '0');
    element.innerHTML = `
      <div class="head">
        <span class="seq"></span>
        <span class="who"></span>
        <span class="what"></span>
        <span class="ref"></span>
        <button class="pin" type="button" aria-pressed="false" title="Keep this one in view">Pin</button>
      </div>
    `;
    (element.querySelector('.seq') as HTMLElement).textContent = String(this.seq).padStart(3, '0');
    (element.querySelector('.who') as HTMLElement).textContent = who;
    (element.querySelector('.what') as HTMLElement).textContent = what;
    (element.querySelector('.ref') as HTMLElement).textContent = reference;

    const row: Row = { entry, element, pinned: false };
    const pin = element.querySelector('.pin') as HTMLButtonElement;
    pin.addEventListener('click', () => {
      row.pinned = !row.pinned;
      pin.setAttribute('aria-pressed', String(row.pinned));
      // a pinned line moves to the strip above, so it survives the scroll
      (row.pinned ? this.pinned : this.stream).prepend(element);
      this.apply();
      pin.blur();
    });

    this.rows.unshift(row);
    this.stream.prepend(element);

    while (this.rows.length > CAP) {
      const oldest = this.rows.findLastIndex((r) => !r.pinned);
      if (oldest === -1) break;
      const dropped = this.rows[oldest];
      if (dropped?.element.querySelector('.verse')) this.verses -= 1;
      dropped?.element.remove();
      this.rows.splice(oldest, 1);
    }
    this.apply();

    return { verse: (line) => this.speak(element, reference, line) };
  }

  /** Hang Scripture under a line, or say plainly that none was served. */
  private speak(element: HTMLElement, reference: string, line: Line | null): void {
    if (!line) {
      const silence = document.createElement('p');
      silence.className = 'silence';
      silence.textContent =
        `${reference} could not be served. No key, and not in the offline pack, ` +
        `so the character says nothing rather than something invented.`;
      element.appendChild(silence);
      return;
    }

    this.verses += 1;

    const quote = document.createElement('blockquote');
    quote.className = 'verse';

    const text = document.createElement('p');
    text.textContent = line.text;
    quote.appendChild(text);

    const cite = document.createElement('footer');
    const where = document.createElement('cite');
    where.textContent = line.reference;
    const source = document.createElement('span');
    source.className = 'src';
    source.textContent = line.source === 'live' ? 'YouVersion, live' : 'offline pack';

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'ghost tiny';
    copy.textContent = 'Copy';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(`${line.text}  ${line.reference}`);
        copy.textContent = 'Copied';
      } catch {
        // the clipboard is permissioned and may simply refuse; say so rather
        // than pretending it worked
        copy.textContent = 'Blocked';
      }
      window.setTimeout(() => {
        copy.textContent = 'Copy';
      }, 1400);
      copy.blur();
    });

    cite.append(where, source, copy);
    quote.appendChild(cite);
    element.appendChild(quote);
    this.apply();
  }
}
