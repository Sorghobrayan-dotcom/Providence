import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { Camera } from '../core/Camera';
import { GameLoop } from '../core/GameLoop';
import { isWithinFacingArc } from '../core/Collision';

const HITSTOP_LIGHT_MS = 45;
const HITSTOP_HEAVY_MS = 90;
const TRAUMA_LIGHT = 0.25;
const TRAUMA_HEAVY = 0.55;

export interface CombatResolverDeps {
  readonly camera: Camera;
  readonly gameLoop: GameLoop;
}

/**
 * A hitbox is "active" for several fixed-update ticks (a 100ms window is
 * six ticks at 60Hz). Both resolvers clear the hitbox the instant it
 * connects so one swing can never deal its damage six times over.
 */
export function resolvePlayerAttackVsBoss(player: Player, boss: Boss, deps: CombatResolverDeps): void {
  const hitbox = player.getActiveAttackHitbox();
  if (!hitbox || boss.invulnerable) return;

  const landed = isWithinFacingArc(
    hitbox.origin,
    hitbox.facing,
    boss.position,
    hitbox.range + boss.radius,
    hitbox.arcRadians,
  );
  if (!landed) return;

  player.setAttackHitbox(null);
  boss.takeDamage(hitbox.damage);
  deps.gameLoop.triggerHitstop(HITSTOP_LIGHT_MS);
  deps.camera.addTrauma(TRAUMA_LIGHT);
}

export function resolveBossAttackVsPlayer(boss: Boss, player: Player, deps: CombatResolverDeps): void {
  const hitbox = boss.getActiveHitbox();
  if (!hitbox) return;

  const inRange = player.position.distanceTo(hitbox.origin) <= hitbox.range + player.radius;
  if (!inRange) return;

  boss.setActiveHitbox(null);

  if (hitbox.parryable && player.parryWindowOpen) {
    player.notifyParried();
    deps.gameLoop.triggerHitstop(HITSTOP_HEAVY_MS);
    deps.camera.addTrauma(TRAUMA_LIGHT);
    return;
  }

  const outcome = player.takeHit(hitbox.damage);
  if (outcome !== 'dodged') {
    deps.gameLoop.triggerHitstop(HITSTOP_HEAVY_MS);
    deps.camera.addTrauma(TRAUMA_HEAVY);
  }
}
