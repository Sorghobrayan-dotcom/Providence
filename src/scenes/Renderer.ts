import { Player } from '../entities/Player';
import { Boss } from '../entities/Boss';
import { Camera } from '../core/Camera';
import { Vector2 } from '../core/Vector2';
import { AtmosphereParticles } from './Particles';
import templeArenaBackdropUrl from '../assets/backgrounds/temple-arena.webp';
import envoySpriteUrl from '../assets/sprites/envoy.webp';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const WORLD_ORIGIN_X = CANVAS_WIDTH / 2;
const WORLD_ORIGIN_Y = CANVAS_HEIGHT / 2 + 40;
const GROUND_Y = WORLD_ORIGIN_Y + 90;

// Where the painted torches land on screen — the procedural flame/embers
// are positioned here so they read as the painting's torches actually
// burning, not a separate light source floating over the art. (Source
// pixel math lives in scripts/prepare-backdrop.mjs, which crops the raw
// 1248x1664 painting down to the exact band this asset ships as.)
const TORCH_SCREEN_POSITIONS: readonly Vector2[] = [new Vector2(96, 240), new Vector2(864, 240)];

// On-screen height of the Envoy sprite — sized against the existing
// combat scale (78px attack reach, 34px boss radius), not the source
// plate's own resolution.
const ENVOY_SPRITE_TARGET_HEIGHT = 100;

export interface DrawParams {
  readonly player: Player;
  readonly boss: Boss;
  readonly camera: Camera;
}

interface EnvoyVariants {
  readonly normal: HTMLCanvasElement;
  readonly parry: HTMLCanvasElement;
  readonly stagger: HTMLCanvasElement;
}

/** Pre-tinted copy of the sprite plate, built once at load time — tinting
 * per-frame with 'source-atop' would force an offscreen composite on every
 * draw for a state that changes a few times a second at most. */
function makeTintedCopy(source: HTMLImageElement, tint: string | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.naturalWidth;
  canvas.height = source.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is not available for sprite tinting.');
  ctx.drawImage(source, 0, 0);
  if (tint) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/**
 * "Vitrail en mouvement": painted backdrops and a pre-rendered character
 * plate (the pre-rendered-background trick — Resident Evil, FF7-9: the eye
 * reads full production art, the engine only ever composites flat images
 * and code-drawn light on top of them), lit and animated with shape,
 * glow and depth-separated layers rather than a 3D pipeline this project
 * has no budget to feed. Depth comes from colour temperature (cool/distant
 * to warm/near), independent parallax on the camera shake per layer, and
 * things that move on their own (torches, embers, drifting fog) even when
 * the combatants don't.
 */
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly atmosphere: AtmosphereParticles;
  private readonly backdropImage: HTMLImageElement;
  private backdropLoaded = false;
  private readonly envoySource: HTMLImageElement;
  private envoyVariants: EnvoyVariants | null = null;
  private elapsedMs = 0;

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is not available.');
    this.ctx = ctx;
    this.atmosphere = new AtmosphereParticles(TORCH_SCREEN_POSITIONS, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });

    // A missing or slow-loading image must never blank the arena — the
    // fallback gradient below covers every frame until (or unless) this
    // resolves, same "the demo must never die" rule as the API clients.
    this.backdropImage = new Image();
    this.backdropImage.onload = () => {
      this.backdropLoaded = true;
    };
    this.backdropImage.src = templeArenaBackdropUrl;

    // Same never-block-the-demo rule: until this resolves, drawPlayer()
    // falls back to the procedural flame silhouette it always drew.
    this.envoySource = new Image();
    this.envoySource.onload = () => {
      this.envoyVariants = {
        normal: makeTintedCopy(this.envoySource, null),
        parry: makeTintedCopy(this.envoySource, 'rgba(127, 215, 255, 0.55)'),
        stagger: makeTintedCopy(this.envoySource, 'rgba(60, 45, 15, 0.6)'),
      };
    };
    this.envoySource.src = envoySpriteUrl;
  }

  /** Advances ambience (torch flicker, embers, fog drift) and emits
   * gameplay-driven particles like the dash trail. Called from the
   * fixed-update tick, so it freezes during hitstop like everything else. */
  update(dtMs: number, player?: Player): void {
    this.elapsedMs += dtMs;
    this.atmosphere.update(dtMs);

    if (player && player.stateName === 'Dashing') {
      const screen = this.toScreen(player.position.x, player.position.y);
      this.atmosphere.emitSparks(screen.x, screen.y, 3);
    }
  }

  draw(params: DrawParams): void {
    const { ctx } = this;
    const shakeOffset = params.camera.getShakeOffset();
    const shakeRotation = params.camera.getShakeRotation();

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.withLayerShake(shakeOffset, shakeRotation, 0.15, () => this.drawBackdrop());
    this.withLayerShake(shakeOffset, shakeRotation, 0.55, () => {
      this.drawTorches();
      this.atmosphere.renderEmbers(ctx);
    });
    this.withLayerShake(shakeOffset, shakeRotation, 1, () => {
      this.drawGroundPlane();
      this.drawReflections(params.player, params.boss);
      this.drawBossTelegraphRing(params.boss);
      this.drawBoss(params.boss);
      this.drawBossHitbox(params.boss);
      this.drawPlayerAttack(params.player);
      this.drawPlayer(params.player);
      this.atmosphere.renderSparks(ctx);
      this.drawNearFog();
      this.atmosphere.renderDust(ctx);
    });

    this.drawVignette(params.player);
  }

  private withLayerShake(offset: Vector2, rotation: number, parallax: number, paint: () => void): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    ctx.rotate(rotation * parallax);
    ctx.translate(-CANVAS_WIDTH / 2 + offset.x * parallax, -CANVAS_HEIGHT / 2 + offset.y * parallax);
    paint();
    ctx.restore();
  }

  private toScreen(worldX: number, worldY: number): Vector2 {
    return new Vector2(WORLD_ORIGIN_X + worldX, WORLD_ORIGIN_Y + worldY);
  }

  // --- Layer 0: painted backdrop ------------------------------------------

  private drawBackdrop(): void {
    if (!this.backdropLoaded) {
      this.drawFallbackBackdrop();
      return;
    }
    this.ctx.drawImage(this.backdropImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /** Plain gradient used only until the painted backdrop loads (or if it
   * never does) — the arena must render something coherent either way. */
  private drawFallbackBackdrop(): void {
    const { ctx } = this;
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a0e18');
    gradient.addColorStop(0.45, '#160f0c');
    gradient.addColorStop(1, '#050303');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawTorches(): void {
    const { ctx } = this;
    for (let i = 0; i < TORCH_SCREEN_POSITIONS.length; i++) {
      const pos = TORCH_SCREEN_POSITIONS[i]!;
      const flicker = 0.75 + Math.sin(this.elapsedMs * 0.012 + i * 4.1) * 0.15 + Math.random() * 0.06;

      // No drawn bracket here — the painted backdrop already has one at
      // this position; only the living flame is code-driven.
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.shadowBlur = 22 * flicker;
      ctx.shadowColor = '#ff9a3d';
      ctx.fillStyle = `rgba(255, 179, 71, ${0.85 * flicker})`;
      ctx.beginPath();
      ctx.moveTo(0, -30 * flicker);
      ctx.bezierCurveTo(9, -14, 10, 2, 0, 8);
      ctx.bezierCurveTo(-10, 2, -9, -14, 0, -30 * flicker);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255, 244, 214, ${0.65 * flicker})`;
      ctx.beginPath();
      ctx.ellipse(0, -6, 3, 8 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // --- Layer 3: ground, reflections, combatants -------------------------

  /** The painted backdrop already supplies the floor's stone texture —
   * this only deepens it slightly near the bottom edge so contact shadows
   * and reflections read clearly against it, rather than repainting it. */
  private drawGroundPlane(): void {
    const { ctx } = this;
    const gradient = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, 'rgba(5, 3, 2, 0)');
    gradient.addColorStop(1, 'rgba(5, 3, 2, 0.55)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
  }

  private drawContactShadow(screen: Vector2, radiusX: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(screen.x, GROUND_Y, radiusX, radiusX * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawReflections(player: Player, boss: Boss): void {
    const { ctx } = this;
    const playerScreen = this.toScreen(player.position.x, player.position.y);
    const bossScreen = this.toScreen(boss.position.x, boss.position.y);

    this.drawContactShadow(playerScreen, 20);
    if (boss.stateName !== 'Banished') this.drawContactShadow(bossScreen, 30);

    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.translate(playerScreen.x, GROUND_Y + (GROUND_Y - playerScreen.y) * 0.4);
    ctx.scale(1, -0.4);
    this.paintPlayerSilhouette('#ffe9a8');
    ctx.restore();

    if (boss.stateName !== 'Banished') {
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.translate(bossScreen.x, GROUND_Y + (GROUND_Y - bossScreen.y) * 0.4);
      ctx.scale(1, -0.4);
      this.paintBossSilhouette('#1a0f0a');
      ctx.restore();
    }
  }

  private paintPlayerSilhouette(fillStyle: string): void {
    const { ctx } = this;
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.bezierCurveTo(-19, 11, -17, -15, 0, -26);
    ctx.bezierCurveTo(17, -15, 19, 11, 0, 24);
    ctx.closePath();
    ctx.fill();
  }

  private drawPlayer(player: Player): void {
    const { ctx } = this;
    const screen = this.toScreen(player.position.x, player.position.y);
    const isStaggered = player.stateName === 'Staggered';
    const isDashing = player.stateName === 'Dashing';
    const isParrying = player.stateName === 'Parrying';
    const isAttacking = player.stateName === 'Attacking';
    const flap = Math.sin(this.elapsedMs * 0.007) * 4;
    const bob = Math.sin(this.elapsedMs * 0.003) * 1.5;
    // Whole-body lunge toward the facing direction while a swing is out —
    // the cheapest readable "attack animation" a silhouette can have.
    const lungeX = isAttacking ? player.facing.x * 8 : 0;
    const lungeY = isAttacking ? player.facing.y * 8 : 0;

    // Backlit halo: the silhouette reads as lit from behind, not pasted on.
    const halo = ctx.createRadialGradient(screen.x, screen.y, 4, screen.x, screen.y, 52);
    halo.addColorStop(0, isParrying ? 'rgba(127, 215, 255, 0.28)' : 'rgba(255, 216, 102, 0.22)');
    halo.addColorStop(1, 'rgba(255, 216, 102, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(screen.x - 52, screen.y - 52, 104, 104);

    ctx.save();
    ctx.translate(screen.x + lungeX, screen.y + lungeY + bob);
    if (player.facing.x < 0) ctx.scale(-1, 1);

    if (this.envoyVariants) {
      const variant = isParrying
        ? this.envoyVariants.parry
        : isStaggered
          ? this.envoyVariants.stagger
          : this.envoyVariants.normal;
      const drawHeight = ENVOY_SPRITE_TARGET_HEIGHT;
      const drawWidth = drawHeight * (variant.width / variant.height);

      // Ghost afterimages while dashing — the cheapest motion-trail a
      // static plate can give without a real skeleton to blur between poses.
      if (isDashing) {
        ctx.globalAlpha = 0.25;
        ctx.drawImage(variant, -drawWidth / 2 - player.facing.x * 14, -drawHeight + 24, drawWidth, drawHeight);
        ctx.globalAlpha = 1;
      }

      ctx.shadowBlur = isDashing ? 26 : 14;
      ctx.shadowColor = isParrying ? '#7fd7ff' : '#ffd866';
      ctx.drawImage(variant, -drawWidth / 2, -drawHeight + 24, drawWidth, drawHeight);
      ctx.shadowBlur = 0;
    } else {
      // Wings + flat fill: the procedural fallback while the sprite loads.
      ctx.strokeStyle = isParrying ? 'rgba(191, 233, 255, 0.75)' : 'rgba(255, 233, 168, 0.6)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * 6, -8);
        ctx.quadraticCurveTo(side * 26, -4 + flap * side, side * 20, 14 + flap);
        ctx.stroke();
      }
      ctx.shadowBlur = isDashing ? 30 : 16;
      ctx.shadowColor = isParrying ? '#7fd7ff' : '#ffd866';
      const bodyColor = isStaggered ? '#8a6b1f' : isParrying ? '#bfe9ff' : '#ffe9a8';
      this.paintPlayerSilhouette(bodyColor);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  private drawPlayerAttack(player: Player): void {
    const hitbox = player.getActiveAttackHitbox();
    if (!hitbox) return;
    const { ctx } = this;
    const screen = this.toScreen(hitbox.origin.x, hitbox.origin.y);
    const facingAngle = hitbox.facing.angle();

    ctx.save();
    ctx.fillStyle = 'rgba(255, 232, 150, 0.35)';
    ctx.beginPath();
    ctx.moveTo(screen.x, screen.y);
    ctx.arc(
      screen.x,
      screen.y,
      hitbox.range,
      facingAngle - hitbox.arcRadians / 2,
      facingAngle + hitbox.arcRadians / 2,
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private paintBossSilhouette(fillStyle: string): void {
    const { ctx } = this;
    const sway = Math.sin(this.elapsedMs * 0.0035) * 4;
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.moveTo(-27, -3);
    ctx.quadraticCurveTo(-32, -24, 0, -32);
    ctx.quadraticCurveTo(32, -24, 27, -3);
    ctx.quadraticCurveTo(15, 12, 8 + sway, 36);
    ctx.quadraticCurveTo(0, 46, -8 + sway, 36);
    ctx.quadraticCurveTo(-15, 12, -27, -3);
    ctx.closePath();
    ctx.fill();
  }

  private drawBoss(boss: Boss): void {
    if (boss.stateName === 'Banished') return;
    const { ctx } = this;
    const screen = this.toScreen(boss.position.x, boss.position.y);
    const isDowned = boss.stateName === 'Downed';

    // Cold anti-halo — where the Envoyé radiates light, the Prince eats it.
    const gloom = ctx.createRadialGradient(screen.x, screen.y, 6, screen.x, screen.y, 70);
    gloom.addColorStop(0, isDowned ? 'rgba(255, 179, 71, 0.14)' : 'rgba(10, 4, 4, 0.5)');
    gloom.addColorStop(1, 'rgba(10, 4, 4, 0)');
    ctx.fillStyle = gloom;
    ctx.fillRect(screen.x - 70, screen.y - 70, 140, 140);

    ctx.save();
    ctx.translate(screen.x, screen.y);

    ctx.shadowBlur = isDowned ? 32 : 12;
    ctx.shadowColor = isDowned ? '#ffb347' : '#5a0f0f';
    this.paintBossSilhouette(isDowned ? 'rgba(45, 22, 10, 0.92)' : '#0c0705');

    ctx.shadowBlur = 0;
    ctx.strokeStyle = isDowned ? 'rgba(255, 179, 71, 0.5)' : 'rgba(255, 75, 43, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-27, -3);
    ctx.quadraticCurveTo(-32, -24, 0, -32);
    ctx.quadraticCurveTo(32, -24, 27, -3);
    ctx.stroke();

    ctx.fillStyle = isDowned ? '#ffb347' : '#ff4b2b';
    ctx.beginPath();
    ctx.arc(-10, -12, 3.5, 0, Math.PI * 2);
    ctx.arc(10, -12, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBossTelegraphRing(boss: Boss): void {
    if (boss.stateName !== 'Telegraphing') return;
    const pattern = boss.currentTelegraphedPattern;
    if (!pattern) return;

    const { ctx } = this;
    const screen = this.toScreen(boss.position.x, boss.position.y);
    ctx.save();
    ctx.strokeStyle = pattern.parryable ? 'rgba(127, 215, 255, 0.55)' : 'rgba(255, 75, 43, 0.55)';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, pattern.reach, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawBossHitbox(boss: Boss): void {
    const hitbox = boss.getActiveHitbox();
    if (!hitbox) return;
    const { ctx } = this;
    const screen = this.toScreen(hitbox.origin.x, hitbox.origin.y);
    ctx.save();
    ctx.fillStyle = hitbox.parryable ? 'rgba(127, 215, 255, 0.3)' : 'rgba(255, 75, 43, 0.3)';
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, hitbox.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawNearFog(): void {
    const { ctx } = this;
    const drift = Math.sin(this.elapsedMs * 0.00009 + 2) * 50;
    const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - 90, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, 'rgba(20, 14, 10, 0)');
    gradient.addColorStop(1, 'rgba(20, 14, 10, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(drift - 60, CANVAS_HEIGHT - 90, CANVAS_WIDTH + 120, 90);
  }

  // --- Overlay: éclat vignette -------------------------------------------

  private drawVignette(player: Player): void {
    const { ctx } = this;
    const eclatDarkness = 1 - player.eclat / player.maxEclat;
    const baseDarkness = 0.22; // Limbo-style edge falloff, present even at full Éclat
    const gradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH * 0.22,
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      CANVAS_WIDTH * 0.7,
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, baseDarkness + eclatDarkness * 0.65)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}
