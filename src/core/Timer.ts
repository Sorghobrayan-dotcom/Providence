/**
 * Countdown utility shared by telegraphs, i-frames, the lie-response window
 * and hitstop. All are "N milliseconds, then something happens" — one
 * primitive instead of ad-hoc counters scattered through every state.
 */
export class Timer {
  private remainingMs: number;
  private readonly totalMs: number;
  private done = false;

  constructor(durationMs: number) {
    this.totalMs = Math.max(0, durationMs);
    this.remainingMs = this.totalMs;
  }

  tick(dtMs: number): boolean {
    if (this.done) return true;
    this.remainingMs -= dtMs;
    if (this.remainingMs <= 0) {
      this.remainingMs = 0;
      this.done = true;
    }
    return this.done;
  }

  reset(durationMs: number = this.totalMs): void {
    this.remainingMs = durationMs;
    this.done = false;
  }

  get isDone(): boolean {
    return this.done;
  }

  get remaining(): number {
    return this.remainingMs;
  }

  /** 0 at start, 1 when finished. */
  get progress(): number {
    if (this.totalMs === 0) return 1;
    return 1 - this.remainingMs / this.totalMs;
  }
}
