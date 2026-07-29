export class Vector2 {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  static fromAngle(radians: number, length: number = 1): Vector2 {
    return new Vector2(Math.cos(radians) * length, Math.sin(radians) * length);
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copyFrom(other: Vector2): this {
    this.x = other.x;
    this.y = other.y;
    return this;
  }

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  scale(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  distanceTo(other: Vector2): number {
    return this.sub(other).length();
  }

  normalize(): Vector2 {
    const len = this.length();
    if (len === 0) return Vector2.zero();
    return new Vector2(this.x / len, this.y / len);
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  lerp(target: Vector2, t: number): Vector2 {
    const clamped = Math.max(0, Math.min(1, t));
    return new Vector2(
      this.x + (target.x - this.x) * clamped,
      this.y + (target.y - this.y) * clamped,
    );
  }
}
