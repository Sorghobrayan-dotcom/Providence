import * as THREE from 'three';

/**
 * What the character says, above its head, in the world.
 *
 * A character does not recite chapter and verse at you. He talks: what Jonah
 * would actually say, standing here, in this node, at this disposition. That
 * line is generated from the structure — the arc, the node, what just changed —
 * and the passage it was drawn from sits underneath it as the reference.
 *
 * One rule survives all of that, and this is where it becomes visible: the
 * developer-facing `note` on every transition is a loose paraphrase we wrote,
 * and it must never reach this class. When there is neither a generated line nor
 * a served passage, the character says nothing at all. Silence is the correct
 * output; an invented line never is.
 *
 * One canvas and one texture for the lifetime of the editor. Allocating a new
 * texture per utterance would hand the GPU a fresh megabyte every time a soul
 * changed its mind, and nothing would ever free it.
 */

const WIDTH = 1024;
const HEIGHT = 360;

/** World width of the plate, in metres. */
const SPAN = 5.4;

const PAD = 34;
const BODY_SIZE = 38;
const BODY_LEAD = 48;
const CITE_SIZE = 20;
const MAX_LINES = 4;

const FACE = `'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif`;
/** Quoted Scripture is set in italic; the character's own words are not. */
const SERIF = `italic ${BODY_SIZE}px ${FACE}`;
const SPOKEN = `${BODY_SIZE}px ${FACE}`;
/* Narration is neither. The editor's own rule is that serif is Scripture and
   nothing else is ever set in it, so a description of what a man is doing is
   set in the same sans the rest of the instrument uses. */
const TOLD = `italic ${BODY_SIZE - 5}px ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`;
const MONO = `${CITE_SIZE}px ui-monospace, 'Cascadia Mono', Consolas, monospace`;

/**
 * Where the words came from.
 *
 * `utterance` is the character's own speech, generated from the arc, the node
 * and the disposition — what Jonah would say, not a passage he recites. It is
 * set roman, because he is talking.
 *
 * `scripture` is the passage itself, shown while there is nothing to generate
 * from. It is set italic, so it reads as the citation it is and never pretends
 * to be dialogue.
 *
 * `narration` is the last resort: nothing was generated and there is no passage
 * to fall back on, and the honest thing left to say is what he is visibly doing.
 * It is set in sans and given no tail, because a tail means somebody said this
 * and nobody did. Inventing him a line here is the one thing forbidden outright.
 */
export type Voicing = 'utterance' | 'scripture' | 'narration';

const FADE_IN = 0.22;
const FADE_OUT = 0.55;

/**
 * Long enough to read without stalling the scene. A verse is not a barks line,
 * so the floor is generous, and the ceiling stops a long passage from parking
 * itself over the world.
 */
function dwellFor(text: string): number {
  return Math.max(2.6, Math.min(9, 1.1 + text.length * 0.045));
}

export class Speech {
  readonly sprite: THREE.Sprite;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly texture: THREE.CanvasTexture;

  private age = 0;
  private dwell = 0;
  private speaking = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0,
      // a line nobody can read is not speech, so it is never occluded by the
      // body that said it
      depthTest: false,
      depthWrite: false,
      fog: false,
    }));
    this.sprite.renderOrder = 999;
    this.sprite.scale.set(SPAN, (SPAN * HEIGHT) / WIDTH, 1);
    // anchor the bottom of the plate, so it sits on the head rather than over it
    this.sprite.center.set(0.5, 0);
    this.sprite.visible = false;
  }

  /** Say something. `voicing` decides whether it reads as speech or as a citation. */
  say(text: string, reference: string, voicing: Voicing = 'scripture'): void {
    this.draw(text, reference, voicing);
    this.age = 0;
    this.dwell = dwellFor(text);
    this.speaking = true;
    this.sprite.visible = true;
  }

  /** Stop mid-sentence. Used when the editor swaps to a different character. */
  hush(): void {
    this.speaking = false;
    this.sprite.visible = false;
    this.sprite.material.opacity = 0;
  }

  get isSpeaking(): boolean {
    return this.speaking;
  }

  update(dtSeconds: number): void {
    if (!this.speaking) return;
    this.age += dtSeconds;

    const out = this.age - this.dwell;
    const opacity = out > 0
      ? 1 - Math.min(1, out / FADE_OUT)
      : Math.min(1, this.age / FADE_IN);

    this.sprite.material.opacity = opacity;

    if (out >= FADE_OUT) this.hush();
  }

  /** Break the text into lines that fit, and mark it if anything was dropped. */
  private wrap(text: string, face: string): string[] {
    const ctx = this.ctx;
    ctx.font = face;
    const limit = WIDTH - PAD * 4;

    const lines: string[] = [];
    let current = '';

    for (const word of text.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= limit) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      current = word;
      if (lines.length === MAX_LINES) break;
    }
    if (current && lines.length < MAX_LINES) lines.push(current);

    // an overlong passage is trimmed rather than allowed to cover the world;
    // the full text is in the console either way
    if (lines.length === MAX_LINES) {
      const last = lines[MAX_LINES - 1] ?? '';
      const spoken = lines.join(' ');
      if (spoken.length < text.length) lines[MAX_LINES - 1] = `${last} …`;
    }
    return lines;
  }

  private draw(text: string, reference: string, voicing: Voicing): void {
    const ctx = this.ctx;
    const face =
      voicing === 'utterance' ? SPOKEN
      : voicing === 'narration' ? TOLD
      : SERIF;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    const lines = this.wrap(text, face);
    const bodyHeight = lines.length * BODY_LEAD;
    const plateHeight = bodyHeight + CITE_SIZE + PAD * 2 + 14;
    const tail = 18;

    // widest line decides the plate, so a short line gets a short plate
    ctx.font = face;
    const widest = lines.reduce((w, l) => Math.max(w, ctx.measureText(l).width), 0);
    const plateWidth = Math.min(WIDTH - PAD, Math.max(widest, ctx.measureText(reference).width) + PAD * 2);

    const left = (WIDTH - plateWidth) / 2;
    const bottom = HEIGHT - tail;
    const top = bottom - plateHeight;

    ctx.beginPath();
    ctx.roundRect(left, top, plateWidth, plateHeight, 6);
    ctx.fillStyle = 'rgba(6, 6, 8, 0.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* A tail, so it is unmistakably this character speaking and not a caption.
       Narration gets none, which is the whole distinction: it IS a caption. */
    if (voicing !== 'narration') {
      ctx.beginPath();
      ctx.moveTo(WIDTH / 2 - 13, bottom - 1);
      ctx.lineTo(WIDTH / 2, bottom + tail);
      ctx.lineTo(WIDTH / 2 + 13, bottom - 1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(6, 6, 8, 0.82)';
      ctx.fill();
    }

    ctx.font = face;
    ctx.fillStyle = voicing === 'narration' ? 'rgba(255, 255, 255, 0.66)' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    lines.forEach((line, i) => {
      ctx.fillText(line, WIDTH / 2, top + PAD + BODY_SIZE + i * BODY_LEAD);
    });

    ctx.font = MONO;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(reference.toUpperCase(), WIDTH / 2, top + PAD + bodyHeight + CITE_SIZE + 6);

    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
    this.sprite.material.dispose();
  }
}
