import { Vector2 } from '../core/Vector2';
import { StateMachine, type IState } from '../core/StateMachine';
import { Timer } from '../core/Timer';
import { InputManager, Action } from '../core/InputManager';
import { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/GameEvents';

const MOVE_SPEED_PX_S = 230;
const DASH_SPEED_PX_S = 620;
const DASH_DURATION_MS = 170;
const DASH_RECOVERY_MS = 90;
const PARRY_WINDOW_MS = 200;
const PARRY_RECOVERY_MS = 220;
const STAGGER_DURATION_MS = 380;
const ATTACK_WINDUP_MS = 90;
const ATTACK_ACTIVE_MS = 100;
const ATTACK_RECOVERY_MS = 210;
const ATTACK_REACH_PX = 78;
const ATTACK_ARC_RAD = Math.PI / 1.7;
const COMBO_DAMAGE = [10, 12, 17] as const;
const PARRY_ECLAT_REGEN = 6;

export interface AttackHitbox {
  readonly origin: Vector2;
  readonly facing: Vector2;
  readonly range: number;
  readonly arcRadians: number;
  readonly damage: number;
}

export class Player {
  readonly position = new Vector2(-140, 0);
  readonly velocity = Vector2.zero();
  facing = new Vector2(1, 0);
  readonly radius = 20;

  readonly maxEclat = 100;
  eclat = this.maxEclat;

  invulnerable = false;
  parryWindowOpen = false;
  comboStep = 0;

  private attackHitbox: AttackHitbox | null = null;

  readonly fsm = new StateMachine<Player>(this);
  readonly input: InputManager;
  readonly events: EventBus<GameEvents>;

  constructor(input: InputManager, events: EventBus<GameEvents>) {
    this.input = input;
    this.events = events;
    this.fsm.changeState(createGroundedState());
  }

  update(dtMs: number): void {
    this.fsm.update(dtMs);
    this.position.x += this.velocity.x * (dtMs / 1000);
    this.position.y += this.velocity.y * (dtMs / 1000);
  }

  setAttackHitbox(hitbox: AttackHitbox | null): void {
    this.attackHitbox = hitbox;
  }

  getActiveAttackHitbox(): AttackHitbox | null {
    return this.attackHitbox;
  }

  /** Called by CombatResolver when an enemy hit lands inside the parry window. */
  notifyParried(): void {
    this.eclat = Math.min(this.maxEclat, this.eclat + PARRY_ECLAT_REGEN);
    this.events.emit('player:parry-success', {});
    this.events.emit('player:eclat-changed', { eclat: this.eclat, maxEclat: this.maxEclat });
    this.fsm.changeState(createGroundedState());
  }

  /** Called by CombatResolver when an enemy hit connects (not parried, not dodged). */
  takeHit(damage: number): 'dodged' | 'hit' | 'dispersed' {
    if (this.invulnerable) return 'dodged';
    this.eclat = Math.max(0, this.eclat - damage);
    this.events.emit('player:hit', { damage });
    this.events.emit('player:eclat-changed', { eclat: this.eclat, maxEclat: this.maxEclat });
    if (this.eclat <= 0) {
      this.fsm.changeState(createDispersedState());
      this.events.emit('player:dispersed', {});
      return 'dispersed';
    }
    this.fsm.changeState(createStaggeredState());
    return 'hit';
  }

  get stateName(): string {
    return this.fsm.currentState?.name ?? 'None';
  }
}

function createGroundedState(): IState<Player> {
  return {
    name: 'Grounded',
    enter(player) {
      player.velocity.set(0, 0);
      // Reaching idle always resets the combo — chaining only happens by
      // queuing the next hit from inside Attacking, never through here.
      player.comboStep = 0;
    },
    update(player, _dtMs) {
      const axis = player.input.movementAxis();
      const direction = new Vector2(axis.x, axis.y);
      if (direction.lengthSquared() > 0) {
        const normalized = direction.normalize();
        player.velocity.copyFrom(normalized.scale(MOVE_SPEED_PX_S));
        player.facing = normalized;
      } else {
        player.velocity.set(0, 0);
      }

      if (player.input.wasPressed(Action.Dodge)) {
        player.fsm.changeState(createDashState(direction.lengthSquared() > 0 ? direction : player.facing));
        return;
      }
      if (player.input.wasPressed(Action.Parry)) {
        player.fsm.changeState(createParryState());
        return;
      }
      if (player.input.wasPressed(Action.Attack)) {
        player.fsm.changeState(createAttackState(player.comboStep));
        return;
      }
    },
  };
}

function createDashState(direction: Vector2): IState<Player> {
  const timer = new Timer(DASH_DURATION_MS);
  const recovery = new Timer(DASH_RECOVERY_MS);
  let inRecovery = false;
  const dashDirection = direction.lengthSquared() > 0 ? direction.normalize() : new Vector2(1, 0);

  return {
    name: 'Dashing',
    enter(player) {
      player.invulnerable = true;
      player.velocity.copyFrom(dashDirection.scale(DASH_SPEED_PX_S));
    },
    update(player, dtMs) {
      if (!inRecovery) {
        if (timer.tick(dtMs)) {
          inRecovery = true;
          player.invulnerable = false;
          player.velocity.set(0, 0);
        }
        return;
      }
      if (recovery.tick(dtMs)) {
        player.fsm.changeState(createGroundedState());
      }
    },
    exit(player) {
      player.invulnerable = false;
    },
  };
}

function createParryState(): IState<Player> {
  const window = new Timer(PARRY_WINDOW_MS);
  const recovery = new Timer(PARRY_RECOVERY_MS);
  let inRecovery = false;

  return {
    name: 'Parrying',
    enter(player) {
      player.velocity.set(0, 0);
      player.parryWindowOpen = true;
    },
    update(player, dtMs) {
      if (!inRecovery) {
        if (window.tick(dtMs)) {
          inRecovery = true;
          player.parryWindowOpen = false;
        }
        return;
      }
      if (recovery.tick(dtMs)) {
        player.fsm.changeState(createGroundedState());
      }
    },
    exit(player) {
      player.parryWindowOpen = false;
    },
  };
}

function createAttackState(previousComboStep: number): IState<Player> {
  const comboStep = previousComboStep % COMBO_DAMAGE.length;
  const windup = new Timer(ATTACK_WINDUP_MS);
  const active = new Timer(ATTACK_ACTIVE_MS);
  const recovery = new Timer(ATTACK_RECOVERY_MS);
  let phase: 'windup' | 'active' | 'recovery' = 'windup';
  let queuedNextAttack = false;

  return {
    name: 'Attacking',
    enter(player) {
      player.velocity.set(0, 0);
      player.comboStep = comboStep + 1;
    },
    update(player, dtMs) {
      if (player.input.wasPressed(Action.Attack) && phase !== 'windup') {
        queuedNextAttack = true;
      }

      if (phase === 'windup') {
        if (windup.tick(dtMs)) {
          phase = 'active';
          player.setAttackHitbox({
            origin: player.position.clone(),
            facing: player.facing,
            range: ATTACK_REACH_PX,
            arcRadians: ATTACK_ARC_RAD,
            damage: COMBO_DAMAGE[comboStep] ?? COMBO_DAMAGE[0],
          });
        }
        return;
      }

      if (phase === 'active') {
        if (active.tick(dtMs)) {
          phase = 'recovery';
          player.setAttackHitbox(null);
        }
        return;
      }

      if (recovery.tick(dtMs)) {
        if (queuedNextAttack) {
          player.fsm.changeState(createAttackState(comboStep + 1));
        } else {
          player.fsm.changeState(createGroundedState());
        }
      }
    },
    exit(player) {
      player.setAttackHitbox(null);
    },
  };
}

function createStaggeredState(): IState<Player> {
  const timer = new Timer(STAGGER_DURATION_MS);

  return {
    name: 'Staggered',
    enter(player) {
      player.velocity.set(0, 0);
    },
    update(player, dtMs) {
      if (timer.tick(dtMs)) {
        player.fsm.changeState(createGroundedState());
      }
    },
  };
}

function createDispersedState(): IState<Player> {
  return {
    name: 'Dispersed',
    enter(player) {
      player.velocity.set(0, 0);
    },
  };
}
