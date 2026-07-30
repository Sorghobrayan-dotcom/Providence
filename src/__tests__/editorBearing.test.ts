import { describe, expect, it } from 'vitest';

import { approachFor, bearingFor, carry, countenanceFor, paceFor, type Carriage } from '../editor/Bearing';
import type { Disposition } from '../providence/types';

/**
 * The layer that puts fear on the body.
 *
 * Until this existed, trust/fear/resolve were three bars in a sidebar and
 * nothing else: a character at fear 0.9 moved exactly like one at fear 0.0.
 * These tests pin the thing that changed, and — more importantly — pin the line
 * it must not cross, which is deciding where anyone goes.
 */

const at = (d: Partial<Disposition>): Disposition =>
  ({ trust: 0.5, fear: 0, resolve: 1, ...d });

const CALM = at({});
const TERRIFIED = at({ fear: 0.95 });

describe('what fear does to the body', () => {
  it('hunches the chest and drops the hips', () => {
    const calm = bearingFor(CALM, 'hold', 0);
    const afraid = bearingFor(TERRIFIED, 'hold', 0);

    expect(calm.hunch).toBe(0);
    expect(calm.crouch).toBe(0);
    expect(afraid.hunch).toBeGreaterThan(0.2);
    expect(afraid.crouch).toBeGreaterThan(0.1);
  });

  it('looks back over the shoulder, but only while running away', () => {
    const fleeing = bearingFor(TERRIFIED, 'away-from-player', 0.7);
    const approaching = bearingFor(TERRIFIED, 'toward-player', 0.7);

    expect(fleeing.glance).toBeGreaterThan(0);
    // there is nothing behind worth checking when you are walking into it
    expect(approaching.glance).toBe(0);
  });

  it('keeps the glance moving rather than freezing the head turned', () => {
    const sampled = [0, 0.4, 0.8, 1.2, 1.6].map(
      (t) => bearingFor(TERRIFIED, 'away-from-player', t).glance,
    );
    expect(new Set(sampled).size).toBeGreaterThan(3);
    expect(Math.min(...sampled)).toBeGreaterThanOrEqual(0);
  });

  it('does not tremble at the fear a character simply lives at', () => {
    // measured across the library: arcs rest at fear 0.1 to 0.2, so resting
    // must be still or every character on the shelf has the shakes
    expect(bearingFor(at({ fear: 0.1 }), 'hold', 0).tremor).toBe(0);
    expect(bearingFor(at({ fear: 0.2 }), 'hold', 0).tremor).toBe(0);
    expect(bearingFor(at({ fear: 0.5 }), 'hold', 0).tremor).toBeGreaterThan(0);
  });

  it('starts trembling smoothly, so it is never a switch flipping', () => {
    const ramp = [0.25, 0.35, 0.5, 0.7, 0.95].map((f) => bearingFor(at({ fear: f }), 'hold', 0).tremor);
    for (let i = 1; i < ramp.length; i += 1) expect(ramp[i]!).toBeGreaterThan(ramp[i - 1]!);
    expect(ramp[0]!).toBeLessThan(0.002);
  });
});

describe('the calibration matches the library that feeds it', () => {
  /* The layer was invisible on its first pass because it was tuned against
     fear 0.95, and nothing in the library goes there. These pin it to the
     range the simulation actually occupies. */

  it('carries real weight at the fear an arc is written with', () => {
    const resting = bearingFor(at({ fear: 0.2 }), 'hold', 0);
    // eight degrees of lean is seen; three is not
    expect(resting.hunch).toBeGreaterThan(0.14);
    expect(resting.crouch).toBeGreaterThan(0.06);
  });

  it('still separates a frightened character from a resting one', () => {
    const resting = bearingFor(at({ fear: 0.2 }), 'hold', 0);
    const frightened = bearingFor(at({ fear: 0.6 }), 'hold', 0);
    expect(frightened.hunch).toBeGreaterThan(resting.hunch * 1.5);
  });

  it('hesitates at the resolve half the shelf is written with', () => {
    const steady = paceFor(at({ resolve: 0.9 }), 'toward-errand', 1.2);
    const wavering = paceFor(at({ resolve: 0.4 }), 'toward-errand', 1.2);
    expect(wavering).toBeLessThan(steady * 0.9);
  });
});

describe('how close it will get', () => {
  it('stops at arm reach rather than inside the other body', () => {
    expect(approachFor(at({ trust: 1 }), 'toward-player')).toBeGreaterThan(1);
  });

  it('keeps its distance from someone it does not trust', () => {
    const close = approachFor(at({ trust: 0.9 }), 'toward-player');
    const wary = approachFor(at({ trust: 0.1 }), 'toward-player');
    expect(wary).toBeGreaterThan(close * 1.6);
  });

  it('asks for no distance when it is not approaching anyone', () => {
    expect(approachFor(at({ trust: 0 }), 'away-from-player')).toBe(0);
    expect(approachFor(at({ trust: 0 }), 'hold')).toBe(0);
  });
});

describe('the countenance', () => {
  it('drains a frightened, distrustful body toward ash', () => {
    const composed = countenanceFor(at({ trust: 0.9, fear: 0 }));
    const stricken = countenanceFor(at({ trust: 0.1, fear: 0.7 }));
    expect(stricken.wither).toBeGreaterThan(composed.wither + 0.4);
  });

  it('lights only what is both trusting and resolved', () => {
    expect(countenanceFor(at({ trust: 1, resolve: 1, fear: 0 })).glow).toBeGreaterThan(0.4);
    expect(countenanceFor(at({ trust: 1, resolve: 0.1, fear: 0 })).glow).toBeLessThan(0.1);
    expect(countenanceFor(at({ trust: 0.1, resolve: 1, fear: 0 })).glow).toBeLessThan(0.1);
  });

  it('stays inside the range the materials can spend', () => {
    for (const trust of [0, 0.5, 1]) {
      for (const fear of [0, 0.5, 1]) {
        for (const resolve of [0, 0.5, 1]) {
          const c = countenanceFor({ trust, fear, resolve });
          expect(c.wither).toBeGreaterThanOrEqual(0);
          expect(c.wither).toBeLessThanOrEqual(1);
          expect(c.glow).toBeGreaterThanOrEqual(0);
          expect(c.glow).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe('what distrust does to the body', () => {
  it('turns the shoulder away, and squares up as trust returns', () => {
    const wary = bearingFor(at({ trust: 0 }), 'hold', 0);
    const open = bearingFor(at({ trust: 1 }), 'hold', 0);

    expect(wary.avert).toBeGreaterThan(0.3);
    expect(open.avert).toBe(0);
  });
});

describe('the pace', () => {
  it('stands still when the directive says hold', () => {
    expect(paceFor(TERRIFIED, 'hold', 0)).toBe(0);
  });

  it('runs harder the more frightened it is', () => {
    const calm = paceFor(CALM, 'away-from-player', 0);
    const afraid = paceFor(TERRIFIED, 'away-from-player', 0);
    expect(afraid).toBeGreaterThan(calm);
    expect(afraid).toBeGreaterThan(1.4);
  });

  it('approaches someone it does not trust slowly', () => {
    const trusting = paceFor(at({ trust: 1 }), 'toward-player', 0);
    const wary = paceFor(at({ trust: 0 }), 'toward-player', 0);
    expect(wary).toBeLessThan(trusting);
  });

  it('falters when resolve has collapsed, and holds steady when it has not', () => {
    const clocks = [0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1];

    const resolute = clocks.map((t) => paceFor(at({ resolve: 1 }), 'toward-errand', t));
    expect(new Set(resolute.map((n) => n.toFixed(4))).size).toBe(1);

    const wavering = clocks.map((t) => paceFor(at({ resolve: 0 }), 'toward-errand', t));
    // it keeps catching: some of the cycle is near a stop, some of it is not
    expect(Math.min(...wavering)).toBeLessThan(0.6);
    expect(Math.max(...wavering)).toBeGreaterThan(0.95);
  });

  it('never stops dead or bolts, whatever the numbers say', () => {
    const extremes: Disposition[] = [
      { trust: -5, fear: 9, resolve: -9 },
      { trust: 9, fear: -9, resolve: 9 },
    ];
    for (const d of extremes) {
      for (const move of ['toward-player', 'away-from-player', 'toward-errand'] as const) {
        for (const t of [0, 1.2, 2.4]) {
          const pace = paceFor(d, move, t);
          expect(pace).toBeGreaterThanOrEqual(0.25);
          expect(pace).toBeLessThanOrEqual(1.9);
        }
      }
    }
  });
});

describe('the layer stays a layer', () => {
  const rig = (): Carriage & { hipsRest: number } => ({
    hips: { position: { y: 0 } },
    torso: { rotation: { x: 0, y: 0 } },
    head: { rotation: { x: 0, y: 0 } },
    hipsRest: 0.9,
  });

  it('adds to a pose instead of replacing it', () => {
    const r = rig();
    // whatever applyPose already put there this frame
    r.torso.rotation.x = 0.42;
    r.torso.rotation.y = 0.3;

    carry(r, bearingFor(TERRIFIED, 'hold', 0), r.hipsRest, 0);

    // the dash lean survives, with the hunch on top of it
    expect(r.torso.rotation.x).toBeGreaterThan(0.42);
    expect(r.torso.rotation.y).toBeGreaterThan(0.3);
  });

  it('keeps the head level as the chest folds', () => {
    const r = rig();
    carry(r, bearingFor(TERRIFIED, 'hold', 0), r.hipsRest, 0);
    // a character whose head follows the hunch walks face-down into the ground
    expect(r.head.rotation.x).toBeLessThan(0);
  });

  it('leaves a composed character exactly as the pose left it', () => {
    const r = rig();
    r.torso.rotation.x = 0.13;
    carry(r, bearingFor(at({ trust: 1, fear: 0 }), 'hold', 0), r.hipsRest, 0);

    expect(r.torso.rotation.x).toBe(0.13);
    expect(r.torso.rotation.y).toBe(0);
    expect(r.head.rotation.x).toBe(0);
    expect(r.hips.position.y).toBe(0.9);
  });
});
