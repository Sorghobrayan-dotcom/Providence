// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { Vector2 } from '../core/Vector2';
import { EventBus } from '../core/EventBus';
import { InputManager, Action } from '../core/InputManager';
import { Camera } from '../core/Camera';
import { GameLoop } from '../core/GameLoop';
import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { PRINCES_MAGICIENS_ENCOUNTER } from '../data/bossEncounters';
import { resolvePlayerAttackVsBoss, resolveBossAttackVsPlayer } from '../combat/CombatResolver';
import { isCorrectVerse } from '../combat/VerseArsenal';
import { judgeFreeformOffline } from '../api/GlooClient';
import type { GameEvents } from '../core/GameEvents';

const STEP_MS = 1000 / 60;
const MAX_TICKS_PER_ATTACK = 60; // generous ceiling for a ~400ms combo swing

/**
 * Drives the real simulation classes tick-by-tick, exactly as GameLoop's
 * fixed-update would, without going through requestAnimationFrame or the
 * DOM canvas — so this exercises the actual shipped combat pipeline
 * (input -> FSM -> collision -> damage -> boss FSM) independently of
 * whether a browser tab happens to be visible and painting.
 */
function harness() {
  const events = new EventBus<GameEvents>();
  const input = new InputManager(window);
  const player = new Player(input, events);
  const boss = new Boss(PRINCES_MAGICIENS_ENCOUNTER, events);
  const camera = new Camera();
  const gameLoop = new GameLoop({ onFixedUpdate: () => {}, onRender: () => {} });
  return { events, input, player, boss, camera, gameLoop };
}

/** One full attack swing (windup -> active -> recovery), landing if boss is in reach. */
function performAttack(
  player: Player,
  boss: Boss,
  input: InputManager,
  deps: { camera: Camera; gameLoop: GameLoop },
): void {
  // Dispatch-then-read, same as the real per-tick order: the keydown must
  // still be an unread "pressed this frame" edge when Grounded's update()
  // checks it. Calling endFrame() before that first update() would clear
  // the edge before anything ever saw it.
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ' }));
  let ticks = 0;
  do {
    player.update(STEP_MS);
    resolvePlayerAttackVsBoss(player, boss, deps);
    input.endFrame();
    ticks += 1;
  } while (player.stateName !== 'Grounded' && ticks < MAX_TICKS_PER_ATTACK);
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyJ' }));
  input.endFrame();
}

describe('Player movement', () => {
  it('moves right while MoveRight is held and stops on release', () => {
    const { player, input } = harness();
    const startX = player.position.x;

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    for (let i = 0; i < 30; i++) {
      player.update(STEP_MS);
      input.endFrame();
    }
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD' }));
    input.endFrame();

    expect(player.position.x).toBeGreaterThan(startX + 100);

    const xAfterRelease = player.position.x;
    for (let i = 0; i < 10; i++) {
      player.update(STEP_MS);
      input.endFrame();
    }
    expect(player.position.x).toBeCloseTo(xAfterRelease, 5);
  });

  it('does not leak game input into a focused textarea (freeform-prompt regression)', () => {
    const { player, input } = harness();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();
    const startX = player.position.x;

    // "Il est écrit" contains j/l/s/space — all bound game keys.
    for (const code of ['KeyJ', 'KeyL', 'KeyS', 'Space']) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code }));
    }
    input.endFrame();
    for (let i = 0; i < 10; i++) {
      player.update(STEP_MS);
      input.endFrame();
    }

    expect(player.position.x).toBe(startX);
    expect(player.stateName).toBe('Grounded');
    document.body.removeChild(textarea);
  });
});

describe('La Nuit du Bâton — full three-phase duel', () => {
  it('takes the boss from phase 1 through to Banished on correct answers', () => {
    const { events, input, player, boss, camera, gameLoop } = harness();
    player.position.copyFrom(new Vector2(150, 0));
    player.facing = new Vector2(1, 0);
    const deps = { camera, gameLoop };

    let banished = false;
    events.on('boss:banished', () => {
      banished = true;
    });

    // --- Phase 1: Jannès -----------------------------------------------
    expect(boss.currentPhase.name).toBe('Jannès, Ombre du Premier Signe');
    for (let swing = 0; swing < 10 && boss.stateName !== 'Downed'; swing++) {
      performAttack(player, boss, input, deps);
    }
    expect(boss.stateName).toBe('Downed');
    expect(isCorrectVerse('josue-1-5', boss.currentPhase.correctVerseId)).toBe(true);
    expect(isCorrectVerse('psaume-27-1', boss.currentPhase.correctVerseId)).toBe(false);

    boss.resolveLieAnswer(true);
    expect(boss.phaseIndex).toBe(1);
    expect(boss.currentPhase.name).toBe('Jambrès, Ombre du Bâton Inversé');
    expect(boss.hp).toBe(boss.currentPhase.maxHp);
    expect(boss.stateName).toBe('Telegraphing');

    // --- Phase 2: Jambrès, first answered WRONG on purpose -------------
    for (let swing = 0; swing < 10 && boss.stateName !== 'Downed'; swing++) {
      performAttack(player, boss, input, deps);
    }
    expect(boss.stateName).toBe('Downed');
    const hpBeforeWrongAnswer = boss.currentPhase.maxHp;
    boss.resolveLieAnswer(false);
    expect(boss.phaseIndex).toBe(1); // still phase 2, it rose instead of advancing
    expect(boss.stateName).toBe('Telegraphing');
    expect(boss.hp).toBeLessThan(hpBeforeWrongAnswer); // rose at half HP, not full
    expect(boss.speedMultiplier).toBeGreaterThan(1); // harder after a wrong answer

    // Finish phase 2 for real this time.
    for (let swing = 0; swing < 10 && boss.stateName !== 'Downed'; swing++) {
      performAttack(player, boss, input, deps);
    }
    expect(boss.stateName).toBe('Downed');
    boss.resolveLieAnswer(true);
    expect(boss.phaseIndex).toBe(2);
    expect(boss.currentPhase.name).toBe('Le Prince Sans Visage');
    expect(boss.currentPhase.correctVerseId).toBeNull(); // free-form phase

    // --- Phase 3: free-form judgment, offline fallback ------------------
    for (let swing = 0; swing < 10 && boss.stateName !== 'Downed'; swing++) {
      performAttack(player, boss, input, deps);
    }
    expect(boss.stateName).toBe('Downed');

    const keywords = boss.currentPhase.freeformFallbackKeywords ?? [];
    const weakAnswer = judgeFreeformOffline('je ne sais pas', keywords);
    expect(weakAnswer.correct).toBe(false);

    const strongAnswer = judgeFreeformOffline(
      "Dieu reste fidèle à sa promesse, il ne nous a jamais oubliés.",
      keywords,
    );
    expect(strongAnswer.correct).toBe(true);

    boss.resolveLieAnswer(true);
    expect(boss.stateName).toBe('Banished');
    expect(banished).toBe(true);
  });
});

describe('Defensive options — parry and dodge', () => {
  it('a parried hit costs no Éclat and regenerates some instead', () => {
    const { events, player, boss, camera, gameLoop } = harness();
    const deps = { camera, gameLoop };
    let parrySucceeded = false;
    events.on('player:parry-success', () => {
      parrySucceeded = true;
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyL' }));
    player.update(STEP_MS); // enters Parrying, opens the window immediately

    boss.setActiveHitbox({ origin: player.position.clone(), range: 50, damage: 20, parryable: true });
    resolveBossAttackVsPlayer(boss, player, deps);

    expect(parrySucceeded).toBe(true);
    expect(player.eclat).toBeGreaterThan(94); // started at maxEclat (100), only regen applied
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyL' }));
  });

  it('a dodge grants invulnerability that blocks damage entirely', () => {
    const { player, boss, camera, gameLoop } = harness();
    const deps = { camera, gameLoop };

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyK' }));
    player.update(STEP_MS); // enters Dashing, invulnerable = true

    expect(player.invulnerable).toBe(true);
    boss.setActiveHitbox({ origin: player.position.clone(), range: 50, damage: 40, parryable: false });
    resolveBossAttackVsPlayer(boss, player, deps);

    expect(player.eclat).toBe(player.maxEclat);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyK' }));
  });

  it('Éclat reaching zero disperses the player', () => {
    const { events, player, boss, camera, gameLoop } = harness();
    const deps = { camera, gameLoop };
    let dispersed = false;
    events.on('player:dispersed', () => {
      dispersed = true;
    });

    for (let i = 0; i < 10 && player.eclat > 0; i++) {
      boss.setActiveHitbox({ origin: player.position.clone(), range: 50, damage: 25, parryable: false });
      resolveBossAttackVsPlayer(boss, player, deps);
    }

    expect(player.eclat).toBe(0);
    expect(player.stateName).toBe('Dispersed');
    expect(dispersed).toBe(true);
  });
});

describe('InputManager', () => {
  it('only counts a fresh press once even if the key auto-repeats', () => {
    const input = new InputManager(window);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ' })); // OS repeat, same code
    expect(input.wasPressed(Action.Attack)).toBe(true);
    input.endFrame();
    expect(input.wasPressed(Action.Attack)).toBe(false);
    expect(input.isDown(Action.Attack)).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyJ' }));
    expect(input.isDown(Action.Attack)).toBe(false);
  });
});
