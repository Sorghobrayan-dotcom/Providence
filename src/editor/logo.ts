/**
 * The mark: a plumb line.
 *
 * It was the only candidate that is not a metaphor. A plumb line is gravity put
 * to work as a measure of uprightness, which is exactly what this library claims
 * to be, and Amos 7:8 uses it for precisely that: "I will set a plumb line in the
 * midst of my people." Physics and judgement in one object.
 *
 * Drawn rather than lettered, because it has to survive at 16 pixels in a browser
 * tab, and because the whole interface is monochrome: a mark that depends on a
 * colour would have nowhere to live here.
 *
 * In the header it is not a picture of a plumb line, it is one. The bob hangs on
 * a damped pendulum: every event in the world knocks it, and it swings back to
 * true under gravity. A still world therefore reads as a mark hanging dead
 * vertical, and a busy one reads as a needle that will not settle. That is the
 * only moving thing in the chrome, and it moves for a reason.
 */

/** Geometry once, so the tab icon and the header cannot drift apart. */
const PLUMB = {
  beamY: 3,
  beamLeft: 4,
  beamRight: 20,
  cordX: 12,
  bobTop: 15,
  bobWidth: 4.2,
  bobBottom: 21.5,
};

function beam(stroke: string, weight: number): string {
  const p = PLUMB;
  return `<line x1="${p.beamLeft}" y1="${p.beamY}" x2="${p.beamRight}" y2="${p.beamY}"
    stroke="${stroke}" stroke-width="${weight}" stroke-linecap="square"/>`;
}

/** The cord and the bob: everything that hangs, and so everything that swings. */
function hanging(stroke: string, weight: number): string {
  const p = PLUMB;
  return `
    <line x1="${p.cordX}" y1="${p.beamY}" x2="${p.cordX}" y2="${p.bobTop}"
          stroke="${stroke}" stroke-width="${weight * 0.7}"/>
    <path d="M ${p.cordX} ${p.bobTop}
             L ${p.cordX + p.bobWidth} ${p.bobTop + 3.4}
             L ${p.cordX} ${p.bobBottom}
             L ${p.cordX - p.bobWidth} ${p.bobTop + 3.4} Z"
          fill="${stroke}"/>
  `;
}

/**
 * The same mark as a tab icon. Heavier strokes, because at 16 pixels a hairline
 * disappears into the background of whatever theme the browser is using.
 */
export function favicon(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <rect width="24" height="24" fill="#000"/>${beam('#fff', 2.2)}${hanging('#fff', 2.2)}</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/\s+/g, ' ').trim());
}

/** Set the tab icon and title. Called once at start-up. */
export function brandTab(title: string): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    ?? document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }));
  link.type = 'image/svg+xml';
  link.href = favicon();
  document.title = title;
}

/* ------------------------------------------------------------------ */
/* The swing                                                           */
/* ------------------------------------------------------------------ */

export interface Swing {
  /** Radians from vertical. Zero is true. */
  readonly angle: number;
  readonly velocity: number;
}

export const AT_REST: Swing = { angle: 0, velocity: 0 };

/* Tuned against the real thing: a knock should be legible across the room and
   gone in about two seconds — the test pins it under three. Stiff enough not to
   look like a toy, damped enough never to become the loudest thing on screen. */
const GRAVITY = 46;
const DAMPING = 2.9;

/** Past this the mark stops looking like a plumb line and starts looking like a
    metronome, so a storm of events saturates rather than escalating. */
const MAX_ANGLE = 0.34;
const MAX_SPEED = 2.2;

const SUBSTEP = 1 / 240;

/**
 * One integration step of a damped pendulum: θ'' = −g·sin θ − c·θ'.
 *
 * Fixed substeps rather than one step of `seconds`, because the same knock has
 * to decay identically on a 60Hz laptop and a 144Hz monitor. The clamp on
 * elapsed time is for the backgrounded tab that wakes up owing four seconds:
 * without it that single frame runs a thousand substeps and the bob teleports.
 */
export function stepSwing(swing: Swing, seconds: number): Swing {
  let { angle, velocity } = swing;
  let left = Math.min(Math.max(seconds, 0), 0.25);

  while (left > 0) {
    const dt = Math.min(SUBSTEP, left);
    velocity += (-GRAVITY * Math.sin(angle) - DAMPING * velocity) * dt;
    angle += velocity * dt;
    left -= dt;
  }

  return {
    angle: Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, angle)),
    velocity: Math.max(-MAX_SPEED, Math.min(MAX_SPEED, velocity)),
  };
}

/** Knock the bob. `force` is roughly 0..1; the sign picks the side. */
export function knock(swing: Swing, force: number): Swing {
  const push = Math.max(-1, Math.min(1, force)) * 1.5;
  return {
    angle: swing.angle,
    velocity: Math.max(-MAX_SPEED, Math.min(MAX_SPEED, swing.velocity + push)),
  };
}

/**
 * Close enough to vertical that another frame would not change a pixel.
 *
 * Grounded in pixels rather than in a pretty-looking epsilon: the bob hangs
 * about 18 units from the anchor on a 24-unit mark, so an angle of 0.014rad
 * displaces it by a quarter of a pixel. Anything below that is arithmetic the
 * screen cannot show, and holding an animation frame open for it is battery
 * spent on nothing.
 */
const BOB_RADIUS = PLUMB.bobBottom - PLUMB.beamY;
const QUARTER_PIXEL = 0.25 / BOB_RADIUS;

export function atRest(swing: Swing): boolean {
  return Math.abs(swing.angle) < QUARTER_PIXEL && Math.abs(swing.velocity) < QUARTER_PIXEL;
}

/* ------------------------------------------------------------------ */
/* The live mark                                                       */
/* ------------------------------------------------------------------ */

/**
 * The header mark, hung on the physics above.
 *
 * It costs nothing when the world is quiet: the animation frame is only
 * requested while the bob is actually moving, and cancelled the moment it
 * settles. Readers who have asked for reduced motion get the static mark, which
 * is the same drawing without the argument.
 */
export class LivePlumbLine {
  readonly root: HTMLElement;
  private readonly hanging: SVGGElement | null;
  private readonly still: boolean;

  private swing: Swing = AT_REST;
  private frame = 0;
  private last = 0;

  constructor(size = 24) {
    this.still = typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.root = document.createElement('span');
    this.root.className = 'mark-live';
    this.root.setAttribute('role', 'img');
    this.root.setAttribute('aria-label', 'Providence');
    this.root.innerHTML = `<svg class="mark" width="${size}" height="${size}" viewBox="0 0 24 24"
      fill="none" aria-hidden="true" focusable="false">
      ${beam('currentColor', 1.6)}
      <g class="hang">${hanging('currentColor', 1.6)}</g>
    </svg>`;

    this.hanging = this.root.querySelector('g.hang');
  }

  /**
   * Something happened in the world. Alternating the side keeps a steady stream
   * of events from pumping the bob in one direction into a spin.
   */
  nudge(force = 0.5): void {
    if (this.still || !this.hanging) return;
    const side = this.swing.velocity >= 0 ? -1 : 1;
    this.swing = knock(this.swing, force * side);
    this.start();
  }

  /** Stop the loop. The editor never tears down, but tests and hot reload do. */
  destroy(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private start(): void {
    if (this.frame) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame((now) => this.tick(now));
  }

  private tick(now: number): void {
    const seconds = (now - this.last) / 1000;
    this.last = now;
    this.swing = stepSwing(this.swing, seconds);
    this.draw();

    if (atRest(this.swing)) {
      // land exactly on true, so a quiet world is visibly plumb and not merely close
      this.swing = AT_REST;
      this.draw();
      this.frame = 0;
      return;
    }
    this.frame = requestAnimationFrame((next) => this.tick(next));
  }

  private draw(): void {
    const degrees = (this.swing.angle * 180) / Math.PI;
    this.hanging?.setAttribute(
      'transform',
      `rotate(${degrees.toFixed(3)} ${PLUMB.cordX} ${PLUMB.beamY})`,
    );
  }
}
