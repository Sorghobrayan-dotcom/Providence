export interface IState<TContext> {
  readonly name: string;
  enter?(context: TContext): void;
  update?(context: TContext, dtMs: number): void;
  exit?(context: TContext): void;
}

/**
 * Generic finite state machine. States are produced by factory functions
 * (not reused singletons) so each entry starts with fresh internal timers —
 * reusing one instance across re-entries is the classic FSM bug where a
 * timer from three fights ago silently survives into the current one.
 */
export class StateMachine<TContext> {
  private current: IState<TContext> | null = null;
  private readonly context: TContext;

  constructor(context: TContext) {
    this.context = context;
  }

  get currentState(): IState<TContext> | null {
    return this.current;
  }

  isIn(name: string): boolean {
    return this.current?.name === name;
  }

  changeState(next: IState<TContext>): void {
    this.current?.exit?.(this.context);
    this.current = next;
    this.current.enter?.(this.context);
  }

  update(dtMs: number): void {
    this.current?.update?.(this.context, dtMs);
  }
}
