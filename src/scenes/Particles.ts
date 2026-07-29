import { Vector2 } from '../core/Vector2';

type ParticleKind = 'ember' | 'dust' | 'spark';

interface LiveParticle {
  readonly position: Vector2;
  readonly velocity: Vector2;
  age: number;
  readonly lifespan: number;
  readonly size: number;
  readonly sway: number;
  readonly kind: ParticleKind;
}

const EMBER_SPAWN_INTERVAL_MS = 220;
const DUST_SPAWN_INTERVAL_MS = 650;
const EMBER_LIFESPAN_MS = 2200;
const DUST_LIFESPAN_MS = 9000;
const SPARK_LIFESPAN_MS = 380;
const MAX_PARTICLES = 200; // hard ceiling — ambience must never become a frame-time liability

/**
 * Two small ambient pools — embers rising off the torches, dust motes
 * drifting through the whole arena — run on the same fixed clock as
 * combat (Scene calls update() from inside fixedUpdate), so they freeze
 * during hitstop exactly like everything else instead of looking detached
 * from the impact. Cheapest possible way to make a static arena breathe.
 */
export class AtmosphereParticles {
  private readonly particles: LiveParticle[] = [];
  private readonly emberSources: readonly Vector2[];
  private readonly bounds: { readonly width: number; readonly height: number };
  private emberSpawnAccumulatorMs = 0;
  private dustSpawnAccumulatorMs = 0;

  constructor(emberSources: readonly Vector2[], bounds: { width: number; height: number }) {
    this.emberSources = emberSources;
    this.bounds = bounds;
  }

  update(dtMs: number): void {
    this.emberSpawnAccumulatorMs += dtMs;
    while (this.emberSpawnAccumulatorMs >= EMBER_SPAWN_INTERVAL_MS) {
      this.emberSpawnAccumulatorMs -= EMBER_SPAWN_INTERVAL_MS;
      this.spawnEmber();
    }
    this.dustSpawnAccumulatorMs += dtMs;
    while (this.dustSpawnAccumulatorMs >= DUST_SPAWN_INTERVAL_MS) {
      this.dustSpawnAccumulatorMs -= DUST_SPAWN_INTERVAL_MS;
      this.spawnDust();
    }

    const dtS = dtMs / 1000;
    for (const particle of this.particles) {
      particle.age += dtMs;
      particle.position.x += particle.velocity.x * dtS + Math.sin(particle.age * 0.004 + particle.sway) * 0.4;
      particle.position.y += particle.velocity.y * dtS;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i]!.age >= this.particles[i]!.lifespan) this.particles.splice(i, 1);
    }
  }

  private spawnEmber(): void {
    if (this.emberSources.length === 0 || this.particles.length >= MAX_PARTICLES) return;
    const source = this.emberSources[Math.floor(Math.random() * this.emberSources.length)]!;
    this.particles.push({
      position: new Vector2(source.x + (Math.random() - 0.5) * 10, source.y),
      velocity: new Vector2(0, -28 - Math.random() * 18),
      age: 0,
      lifespan: EMBER_LIFESPAN_MS * (0.7 + Math.random() * 0.6),
      size: 1.4 + Math.random() * 1.6,
      sway: Math.random() * Math.PI * 2,
      kind: 'ember',
    });
  }

  private spawnDust(): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({
      position: new Vector2(Math.random() * this.bounds.width, Math.random() * this.bounds.height * 0.75),
      velocity: new Vector2((Math.random() - 0.5) * 4, -3 - Math.random() * 3),
      age: 0,
      lifespan: DUST_LIFESPAN_MS * (0.6 + Math.random() * 0.8),
      size: 0.8 + Math.random(),
      sway: Math.random() * Math.PI * 2,
      kind: 'dust',
    });
  }

  /** Burst of golden sparks at a screen position — the dash trail. Caller
   * decides when (Renderer emits while the player is dashing). */
  emitSparks(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 50;
      this.particles.push({
        position: new Vector2(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 16),
        velocity: new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed - 15),
        age: 0,
        lifespan: SPARK_LIFESPAN_MS * (0.6 + Math.random() * 0.8),
        size: 1 + Math.random() * 1.4,
        sway: 0,
        kind: 'spark',
      });
    }
  }

  private renderKind(ctx: CanvasRenderingContext2D, kind: ParticleKind): void {
    for (const particle of this.particles) {
      if (particle.kind !== kind) continue;
      const lifeRatio = particle.age / particle.lifespan;
      const fade = kind === 'ember' ? Math.sin(Math.min(lifeRatio, 1) * Math.PI) : 1 - lifeRatio;
      if (fade <= 0) continue;

      ctx.save();
      if (kind === 'ember') {
        ctx.globalAlpha = fade * 0.85;
        ctx.fillStyle = '#ffb347';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#ff8a3d';
      } else if (kind === 'spark') {
        ctx.globalAlpha = fade * 0.95;
        ctx.fillStyle = '#fff4d6';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffd866';
      } else {
        ctx.globalAlpha = fade * 0.16;
        ctx.fillStyle = '#d9c9a3';
      }
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderEmbers(ctx: CanvasRenderingContext2D): void {
    this.renderKind(ctx, 'ember');
  }

  renderDust(ctx: CanvasRenderingContext2D): void {
    this.renderKind(ctx, 'dust');
  }

  renderSparks(ctx: CanvasRenderingContext2D): void {
    this.renderKind(ctx, 'spark');
  }
}
