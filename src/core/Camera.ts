import { Vector2 } from './Vector2';

const TRAUMA_DECAY_PER_MS = 0.0018;
const MAX_OFFSET_PX = 18;
const MAX_ROTATION_RAD = 0.03;

/**
 * Trauma-based screen shake (Squirrel Eiserloh's GDC formulation): the
 * camera tracks a "trauma" value in [0,1] that decays over time, and the
 * actual shake offset is trauma SQUARED. Squaring keeps small bumps nearly
 * invisible while a big hit still produces a violent kick — a linear
 * mapping makes every hit shake the same amount and feels flat.
 */
export class Camera {
  private trauma = 0;
  private seed = Math.random() * 1000;

  addTrauma(amount: number): void {
    this.trauma = Math.max(0, Math.min(1, this.trauma + amount));
  }

  update(dtMs: number): void {
    this.trauma = Math.max(0, this.trauma - TRAUMA_DECAY_PER_MS * dtMs);
    this.seed += dtMs * 0.02;
  }

  getShakeOffset(): Vector2 {
    const shake = this.trauma * this.trauma;
    const offsetX = MAX_OFFSET_PX * shake * Math.sin(this.seed * 13.7);
    const offsetY = MAX_OFFSET_PX * shake * Math.cos(this.seed * 9.3);
    return new Vector2(offsetX, offsetY);
  }

  getShakeRotation(): number {
    const shake = this.trauma * this.trauma;
    return MAX_ROTATION_RAD * shake * Math.sin(this.seed * 17.1);
  }
}
