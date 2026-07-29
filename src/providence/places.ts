/**
 * Places.
 *
 * An engine deals in rules, agents and space. Arcs cover agents; this covers
 * space. The text is unusually precise about ground: how you approach what is
 * set apart, and where safety has to sit so it can actually be reached in time.
 */

/* ------------------------------------------------------------------ */
/* The Tabernacle: graduated access                                    */
/* ------------------------------------------------------------------ */

/**
 * Games gate space with keys. You either hold the object or you do not.
 * The tabernacle gates it with QUALIFICATION: each threshold asks what you are,
 * not what you carry, and each inner court admits fewer than the one outside it.
 * Exodus 26 and following.
 */
export interface Threshold {
  readonly zone: string;
  /** Zero is the outermost ground, higher numbers are further in. */
  readonly depth: number;
  /** What a visitor must BE, not what they must hold. */
  readonly requires: readonly string[];
  /** How many may stand here at once. Infinity for unrestricted. */
  readonly capacity: number;
  readonly source: string;
}

export const TABERNACLE: readonly Threshold[] = [
  { zone: 'camp', depth: 0, requires: [], capacity: Infinity, source: 'NUM.2.2' },
  { zone: 'parvis', depth: 1, requires: ['clean'], capacity: Infinity, source: 'EXO.27.9' },
  { zone: 'lieu-saint', depth: 2, requires: ['clean', 'consecrated'], capacity: 12, source: 'EXO.26.33' },
  { zone: 'lieu-tres-saint', depth: 3, requires: ['clean', 'consecrated', 'appointed'], capacity: 1, source: 'LEV.16.17' },
];

export interface Bearer {
  readonly id: string;
  readonly qualities: readonly string[];
}

export interface AccessVerdict {
  readonly granted: boolean;
  readonly zone: string;
  /** Which qualities were missing. Empty when granted. */
  readonly missing: readonly string[];
  /** The passage the threshold is drawn from, for the engine to state its reason. */
  readonly because: string;
}

/**
 * Resolve entry into a zone. Returns the deepest zone the bearer may occupy
 * when asked for one they cannot enter, rather than a bare refusal: being
 * turned back to the court is not the same as being thrown out of the camp.
 */
export function admit(bearer: Bearer, zoneName: string, occupancy: Readonly<Record<string, number>> = {}): AccessVerdict {
  const target = TABERNACLE.find((t) => t.zone === zoneName);
  if (!target) throw new Error(`No threshold named "${zoneName}".`);

  const held = new Set(bearer.qualities);
  const missing = target.requires.filter((q) => !held.has(q));
  const inside = occupancy[zoneName] ?? 0;

  if (missing.length === 0 && inside < target.capacity) {
    return { granted: true, zone: zoneName, missing: [], because: target.source };
  }

  // fall back to the deepest zone this bearer genuinely qualifies for
  const permitted = [...TABERNACLE]
    .filter((t) => t.requires.every((q) => held.has(q)) && (occupancy[t.zone] ?? 0) < t.capacity)
    .sort((a, b) => b.depth - a.depth)[0];

  return {
    granted: false,
    zone: permitted?.zone ?? 'camp',
    missing,
    because: target.source,
  };
}

/* ------------------------------------------------------------------ */
/* Cities of refuge: placement under a travel-time guarantee           */
/* ------------------------------------------------------------------ */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface RefugePlan {
  readonly cities: readonly Point[];
  /** Worst-case distance from any settlement to its nearest refuge. */
  readonly worstDistance: number;
  /** True when every settlement is inside the required reach. */
  readonly guaranteeHeld: boolean;
  readonly source: string;
}

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export function nearestRefuge(from: Point, cities: readonly Point[]): number {
  return cities.reduce((best, c) => Math.min(best, distance(from, c)), Infinity);
}

/**
 * Place sanctuaries so that no one is ever too far from one to reach it in time.
 *
 * This is the constraint the text actually states: the roads are to be prepared
 * and the land divided so the fugitive can get there (Deuteronomy 19:3). It is a
 * covering problem, not a decoration problem, so it is solved as one: greedy
 * farthest-point placement, which repeatedly puts the next city where the worst
 * currently-served settlement is. That gives a strong worst-case, which is
 * exactly what a guarantee about the slowest runner requires.
 */
export function placeRefuges(settlements: readonly Point[], count = 6, dayOfTravel = Infinity): RefugePlan {
  if (settlements.length === 0) {
    return { cities: [], worstDistance: 0, guaranteeHeld: true, source: 'DEU.19.3' };
  }

  const cities: Point[] = [settlements[0] as Point];
  while (cities.length < count && cities.length < settlements.length) {
    let farthest = settlements[0] as Point;
    let farthestDistance = -1;
    for (const s of settlements) {
      const d = nearestRefuge(s, cities);
      if (d > farthestDistance) {
        farthestDistance = d;
        farthest = s;
      }
    }
    cities.push(farthest);
  }

  const worstDistance = settlements.reduce((worst, s) => Math.max(worst, nearestRefuge(s, cities)), 0);
  return {
    cities,
    worstDistance,
    guaranteeHeld: worstDistance <= dayOfTravel,
    source: 'DEU.19.3',
  };
}

/* ------------------------------------------------------------------ */
/* Babel: comprehension decays with ambition                           */
/* ------------------------------------------------------------------ */

/**
 * Genesis 11. Past a threshold of collective ambition, a shared project stops
 * being shared: the builders can no longer understand one another. Returns the
 * proportion of a message that survives between two players.
 */
export function comprehension(height: number, threshold: number): number {
  if (height <= threshold) return 1;
  const excess = (height - threshold) / threshold;
  return Math.max(0, 1 - excess);
}
