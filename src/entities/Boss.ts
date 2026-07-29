import { Vector2 } from '../core/Vector2';
import { StateMachine, type IState } from '../core/StateMachine';
import { Timer } from '../core/Timer';
import { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/GameEvents';

export interface AttackPattern {
  readonly id: string;
  readonly telegraphMs: number;
  readonly activeMs: number;
  readonly recoveryMs: number;
  readonly damage: number;
  readonly reach: number;
  readonly parryable: boolean;
}

export interface BossPhaseConfig {
  readonly name: string;
  readonly maxHp: number;
  readonly patterns: readonly AttackPattern[];
  readonly lie: string;
  /** null => the phase is closed by a free-form answer judged by Gloo, not an arsenal pick. */
  readonly correctVerseId: string | null;
  /** Attack-speed multiplier applied if the player answers the lie incorrectly. */
  readonly riseSpeedMultiplier: number;
  /** Only used when correctVerseId is null — keywords the offline judge accepts if Gloo is unreachable. */
  readonly freeformFallbackKeywords?: readonly string[];
}

export interface EnemyHitbox {
  readonly origin: Vector2;
  readonly range: number;
  readonly damage: number;
  readonly parryable: boolean;
}

export class Boss {
  readonly position = new Vector2(240, 0);
  readonly radius = 34;

  phaseIndex = 0;
  hp: number;
  speedMultiplier = 1;
  invulnerable = false;

  private activeHitbox: EnemyHitbox | null = null;
  private telegraphedPatternId: string | null = null;

  readonly fsm = new StateMachine<Boss>(this);
  readonly phases: readonly BossPhaseConfig[];
  readonly events: EventBus<GameEvents>;

  constructor(phases: readonly BossPhaseConfig[], events: EventBus<GameEvents>) {
    if (phases.length === 0) throw new Error('Boss requires at least one phase.');
    this.phases = phases;
    this.events = events;
    this.hp = this.currentPhase.maxHp;
    this.fsm.changeState(createTelegraphState());
  }

  get currentPhase(): BossPhaseConfig {
    const phase = this.phases[this.phaseIndex];
    if (!phase) throw new Error(`No boss phase configured at index ${this.phaseIndex}.`);
    return phase;
  }

  get isFinalPhase(): boolean {
    return this.phaseIndex === this.phases.length - 1;
  }

  get stateName(): string {
    return this.fsm.currentState?.name ?? 'None';
  }

  get currentTelegraphedPattern(): AttackPattern | null {
    if (!this.telegraphedPatternId) return null;
    return this.currentPhase.patterns.find((p) => p.id === this.telegraphedPatternId) ?? null;
  }

  setTelegraphedPattern(patternId: string | null): void {
    this.telegraphedPatternId = patternId;
  }

  update(dtMs: number): void {
    this.fsm.update(dtMs * this.speedMultiplier);
  }

  setActiveHitbox(hitbox: EnemyHitbox | null): void {
    this.activeHitbox = hitbox;
  }

  getActiveHitbox(): EnemyHitbox | null {
    return this.activeHitbox;
  }

  /** Called by CombatResolver when a player attack lands during a vulnerable state. */
  takeDamage(damage: number): void {
    if (this.invulnerable) return;
    this.hp = Math.max(0, this.hp - damage);
    this.events.emit('boss:hit', { damage, hpRemaining: this.hp, maxHp: this.currentPhase.maxHp });
    if (this.hp <= 0) {
      this.fsm.changeState(createDownedState());
    }
  }

  /** Called by the scene once the lie has been answered (arsenal pick or Gloo verdict). */
  resolveLieAnswer(correct: boolean): void {
    if (!this.fsm.isIn('Downed')) return;
    if (correct) {
      if (this.isFinalPhase) {
        this.fsm.changeState(createBanishedState());
      } else {
        this.phaseIndex += 1;
        this.hp = this.currentPhase.maxHp;
        this.speedMultiplier = 1;
        this.events.emit('boss:phase-advanced', {
          phaseIndex: this.phaseIndex,
          phaseName: this.currentPhase.name,
          maxHp: this.currentPhase.maxHp,
        });
        this.fsm.changeState(createTelegraphState());
      }
    } else {
      this.hp = Math.round(this.currentPhase.maxHp * 0.5);
      this.speedMultiplier = this.currentPhase.riseSpeedMultiplier;
      this.events.emit('boss:rose', { phaseIndex: this.phaseIndex, phaseName: this.currentPhase.name });
      this.fsm.changeState(createTelegraphState());
    }
  }
}

function pickPattern(boss: Boss): AttackPattern {
  const patterns = boss.currentPhase.patterns;
  if (patterns.length === 0) {
    throw new Error(`Boss phase "${boss.currentPhase.name}" has no attack patterns configured.`);
  }
  const index = Math.floor(Math.random() * patterns.length);
  return patterns[index] as AttackPattern;
}

function createTelegraphState(): IState<Boss> {
  let timer: Timer;
  let pattern: AttackPattern;

  return {
    name: 'Telegraphing',
    enter(boss) {
      pattern = pickPattern(boss);
      timer = new Timer(pattern.telegraphMs);
      boss.setTelegraphedPattern(pattern.id);
      boss.invulnerable = false;
    },
    update(boss, dtMs) {
      if (timer.tick(dtMs)) {
        boss.fsm.changeState(createActiveState(pattern));
      }
    },
    exit(boss) {
      boss.setTelegraphedPattern(null);
    },
  };
}

function createActiveState(pattern: AttackPattern): IState<Boss> {
  const timer = new Timer(pattern.activeMs);

  return {
    name: 'Active',
    enter(boss) {
      boss.setActiveHitbox({
        origin: boss.position.clone(),
        range: pattern.reach,
        damage: pattern.damage,
        parryable: pattern.parryable,
      });
    },
    update(boss, dtMs) {
      if (timer.tick(dtMs)) {
        boss.fsm.changeState(createRecoveryState(pattern));
      }
    },
    exit(boss) {
      boss.setActiveHitbox(null);
    },
  };
}

function createRecoveryState(pattern: AttackPattern): IState<Boss> {
  const timer = new Timer(pattern.recoveryMs);

  return {
    name: 'Recovery',
    update(boss, dtMs) {
      if (timer.tick(dtMs)) {
        boss.fsm.changeState(createTelegraphState());
      }
    },
  };
}

function createDownedState(): IState<Boss> {
  return {
    name: 'Downed',
    enter(boss) {
      boss.invulnerable = true;
      boss.setActiveHitbox(null);
      boss.setTelegraphedPattern(null);
      const phase = boss.currentPhase;
      boss.events.emit('boss:downed', {
        phaseIndex: boss.phaseIndex,
        phaseName: phase.name,
        lie: phase.lie,
        requiresFreeform: phase.correctVerseId === null,
      });
    },
  };
}

function createBanishedState(): IState<Boss> {
  return {
    name: 'Banished',
    enter(boss) {
      boss.invulnerable = true;
      boss.setActiveHitbox(null);
      boss.events.emit('boss:banished', {});
    },
  };
}
