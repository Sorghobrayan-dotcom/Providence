/**
 * How a creature goes, as distinct from where it is going.
 *
 * The directive already answers the destination: toward the player, away from
 * the errand, hold. What it has never answered is the shape of the line taken
 * to get there, so every creature in the library walks the same dead-straight
 * path and only the direction differs. A serpent and a giant close the same
 * distance identically, which is wrong about both of them.
 *
 * Scripture is unusually specific about this. Three things are too wonderful,
 * and one of them is the way of a serpent on a rock — not where it went, how it
 * went. The Philistine came on and drew near, and kept drawing near. The ass
 * turned aside out of the road, and no beating put her back on it.
 *
 * The boundary this module keeps:
 *
 *   the directive decides the destination. Nothing here overrides it, and a way
 *   that could refuse to arrive would be a second decision-maker fighting the
 *   first.
 *
 *   Bearing decides pace and body. A way is heading only, so that a frightened
 *   serpent still weaves and a confident one still weaves, at different speeds.
 *
 * The table is sparse for the same reason testimony's is. Most creatures walk
 * toward what they want, and the serpent's approach only reads as sinister
 * because everyone else's is straight.
 */

const TAU = Math.PI * 2;
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** Within this much of the target a way begins to straighten out. */
const SETTLING_METRES = 6;

export interface Way {
  readonly id: string;
  readonly label: string;
  /**
   * Constant bias off the desired heading, radians. Positive bears to its own
   * right. A creature that consistently pulls to one side rather than weaving.
   */
  readonly veer: number;
  /** Peak swing either side of the heading, radians. */
  readonly swing: number;
  /** Swings per second. */
  readonly rate: number;
  /**
   * How much of veer and swing survive at contact, 0..1.
   *
   * Zero straightens to arrive, which is what makes a flanking approach read as
   * an approach rather than as an orbit: it comes in off-axis and finishes in a
   * line. A way that never settles never gets there.
   */
  readonly settles: number;
  /**
   * Personal space this way insists on, metres, overriding what Bearing would
   * keep. Only for creatures whose whole point is that they do not respect it.
   */
  readonly closesTo?: number;
  readonly source: string;
  readonly note: string;
}

/** Straight at it. Every creature not named below. */
export const STRAIGHT: Way = {
  id: 'straight',
  label: 'Tout droit',
  veer: 0,
  swing: 0,
  rate: 0,
  settles: 0,
  source: 'PRO.4.25',
  note: 'let your eyes look directly forward, and your gaze be straight before you',
};

/**
 * Whose way is worth naming.
 *
 * The amplitudes are set against the movement code as it actually runs: bodies
 * travel 0.16 normalised units per second across an eighteen metre field, so
 * 2.88 m/s. A heading swung by A radians at f hertz displaces a body sideways
 * by about v·A / 2πf, which puts the serpent's weave at roughly 1.2 metres —
 * about a body's width either side, on a figure framed from seven metres back.
 * Halve the swing and it reads as drift; double it and he is walking sideways.
 */
export const WAYS: Readonly<Record<string, Way>> = {
  serpent: {
    id: 'flanking',
    label: 'L Approche oblique',
    veer: 0.25,
    swing: 0.8,
    rate: 0.3,
    settles: 0.15,
    source: 'PRO.30.19',
    note: 'the way of a serpent on a rock, named as a wonder rather than a route',
  },

  /* He does not argue from one place. He takes him to the pinnacle, then to the
     mountain: the repositioning is the method. */
  tempter: {
    id: 'circling',
    label: 'Le Contournement',
    veer: 0.5,
    swing: 0.45,
    rate: 0.18,
    settles: 0.4,
    source: 'MAT.4.5',
    note: 'he takes him to one place, then to another, and asks again from there',
  },

  /* The whole of him is that he keeps coming and does not stop where a stranger
     would. Straight line, and no personal space at all. */
  goliath: {
    id: 'bearing-down',
    label: 'La Charge',
    veer: 0,
    swing: 0,
    rate: 0,
    settles: 0,
    closesTo: 0.55,
    source: '1SA.17.41',
    note: 'the Philistine came on and drew near, and the man bearing the shield went before him',
  },

  /* She leaves the road. Not a weave — a decision to one side that a beating
     does not undo, which is why this is veer with almost no swing. */
  'balaams-donkey': {
    id: 'turning-aside',
    label: 'L Ecart',
    veer: 0.9,
    swing: 0.12,
    rate: 0.5,
    settles: 0.8,
    source: 'NUM.22.23',
    note: 'she turned aside out of the road and went into the field, and he struck her',
  },
};

export function wayFor(arcId: string): Way {
  return WAYS[arcId] ?? STRAIGHT;
}

/**
 * The heading actually taken, given the one the directive wants.
 *
 * `desired` and the result are both world-space radians. `metres` is the
 * remaining distance, which is what lets a way straighten as it arrives.
 */
export function headingFor(way: Way, desired: number, seconds: number, metres: number): number {
  if (way.swing === 0 && way.veer === 0) return desired;
  if (!Number.isFinite(metres) || !Number.isFinite(seconds)) return desired;

  // 0 far out, 1 at contact
  const closing = clamp01(1 - Math.max(0, metres) / SETTLING_METRES);
  const held = way.settles + (1 - way.settles) * (1 - closing);

  const swung = way.swing === 0 ? 0 : Math.sin(seconds * way.rate * TAU) * way.swing;
  return desired + (way.veer + swung) * held;
}

/**
 * How close this way insists on getting.
 *
 * Returns the fallback untouched for every creature that has no opinion, so
 * Bearing keeps deciding personal space for all but the handful whose whole
 * character is that they ignore it.
 */
export function spaceFor(way: Way, fallbackMetres: number): number {
  return way.closesTo ?? fallbackMetres;
}
