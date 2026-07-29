// A plain `enum` requires the compiler to emit a runtime object with
// reverse mappings, which `erasableSyntaxOnly` rejects (the whole point of
// that flag is that stripping types must never change what code exists).
// This const-object-plus-derived-union is the standard replacement: same
// `Action.Attack` ergonomics at every call site, zero non-erasable syntax.
export const Action = {
  MoveLeft: 'MoveLeft',
  MoveRight: 'MoveRight',
  MoveUp: 'MoveUp',
  MoveDown: 'MoveDown',
  Attack: 'Attack',
  Dodge: 'Dodge',
  Parry: 'Parry',
  Confirm: 'Confirm',
  Cancel: 'Cancel',
} as const;

export type Action = (typeof Action)[keyof typeof Action];

const KEY_BINDINGS: Record<Action, readonly string[]> = {
  [Action.MoveLeft]: ['ArrowLeft', 'KeyA'],
  [Action.MoveRight]: ['ArrowRight', 'KeyD'],
  [Action.MoveUp]: ['ArrowUp', 'KeyW'],
  [Action.MoveDown]: ['ArrowDown', 'KeyS'],
  [Action.Attack]: ['KeyJ'],
  [Action.Dodge]: ['ShiftLeft', 'KeyK'],
  [Action.Parry]: ['KeyL'],
  [Action.Confirm]: ['Enter', 'Space'],
  [Action.Cancel]: ['Escape'],
};

const ALL_BOUND_CODES = new Set(Object.values(KEY_BINDINGS).flat());

/** The freeform-answer textarea shares the page with game input; while it
 * has focus, key codes like KeyJ/KeyL/Space must reach it as normal text,
 * not get eaten as Attack/Parry/Confirm. */
function isTypingIntoField(): boolean {
  const active = document.activeElement;
  return active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement;
}

/**
 * Captures press/release edges directly in the DOM event handlers rather
 * than diffing a "down" set frame to frame. Diffing loses any key that is
 * pressed and released between two fixed-update ticks; capturing at the
 * event guarantees a fast tap on a 30ms attack input is never dropped.
 */
export class InputManager {
  private readonly down = new Set<string>();
  private readonly pressedThisFrame = new Set<string>();
  private readonly releasedThisFrame = new Set<string>();

  constructor(target: Window = window) {
    target.addEventListener('keydown', this.handleKeyDown);
    target.addEventListener('keyup', this.handleKeyUp);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (isTypingIntoField()) return; // let the freeform-answer textarea receive normal keystrokes
    if (ALL_BOUND_CODES.has(event.code)) event.preventDefault();
    if (this.down.has(event.code)) return; // ignore OS key-repeat
    this.down.add(event.code);
    this.pressedThisFrame.add(event.code);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (isTypingIntoField()) return;
    this.down.delete(event.code);
    this.releasedThisFrame.add(event.code);
  };

  isDown(action: Action): boolean {
    return KEY_BINDINGS[action].some((code) => this.down.has(code));
  }

  wasPressed(action: Action): boolean {
    return KEY_BINDINGS[action].some((code) => this.pressedThisFrame.has(code));
  }

  wasReleased(action: Action): boolean {
    return KEY_BINDINGS[action].some((code) => this.releasedThisFrame.has(code));
  }

  /** Axis in [-1, 1] built from the four movement actions. */
  movementAxis(): { x: number; y: number } {
    const x = (this.isDown(Action.MoveRight) ? 1 : 0) - (this.isDown(Action.MoveLeft) ? 1 : 0);
    const y = (this.isDown(Action.MoveDown) ? 1 : 0) - (this.isDown(Action.MoveUp) ? 1 : 0);
    return { x, y };
  }

  /** Must run once per fixed step, after gameplay has read this frame's edges. */
  endFrame(): void {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
  }

  dispose(target: Window = window): void {
    target.removeEventListener('keydown', this.handleKeyDown);
    target.removeEventListener('keyup', this.handleKeyUp);
  }
}
