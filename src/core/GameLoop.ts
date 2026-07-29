const FIXED_STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250; // clamp the delta after a tab was backgrounded

export interface GameLoopCallbacks {
  /** Deterministic simulation step. Always called with exactly FIXED_STEP_MS. */
  onFixedUpdate(dtMs: number): void;
  /** Called once per animation frame with an interpolation alpha in [0,1]. */
  onRender(alpha: number): void;
}

/**
 * Fixed-timestep accumulator loop (Glenn Fiedler, "Fix Your Timestep").
 * Combat math (parry windows, telegraph timings) runs at a constant 60Hz
 * regardless of the monitor's refresh rate, so a 144Hz screen can't get a
 * frame-perfect parry window that a 60Hz screen can't reach. Rendering
 * still runs every animation frame and interpolates between simulation
 * states for smoothness.
 */
export class GameLoop {
  private accumulatorMs = 0;
  private lastTimestampMs: number | null = null;
  private rafHandle = 0;
  private running = false;
  private hitstopRemainingMs = 0;
  private readonly callbacks: GameLoopCallbacks;

  constructor(callbacks: GameLoopCallbacks) {
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestampMs = null;
    this.rafHandle = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafHandle);
  }

  /** Freeze the simulation (not the render) for a short, impactful pause. */
  triggerHitstop(durationMs: number): void {
    this.hitstopRemainingMs = Math.max(this.hitstopRemainingMs, durationMs);
  }

  private readonly tick = (timestampMs: number): void => {
    if (!this.running) return;

    if (this.lastTimestampMs === null) {
      this.lastTimestampMs = timestampMs;
    }
    const frameMs = Math.min(timestampMs - this.lastTimestampMs, MAX_FRAME_MS);
    this.lastTimestampMs = timestampMs;
    this.accumulatorMs += frameMs;

    while (this.accumulatorMs >= FIXED_STEP_MS) {
      if (this.hitstopRemainingMs > 0) {
        this.hitstopRemainingMs -= FIXED_STEP_MS;
      } else {
        this.callbacks.onFixedUpdate(FIXED_STEP_MS);
      }
      this.accumulatorMs -= FIXED_STEP_MS;
    }

    const alpha = this.accumulatorMs / FIXED_STEP_MS;
    this.callbacks.onRender(alpha);

    this.rafHandle = requestAnimationFrame(this.tick);
  };
}
