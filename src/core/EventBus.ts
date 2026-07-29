type Listener<TPayload> = (payload: TPayload) => void;

/**
 * Typed publish/subscribe bus. Systems that must not know about each other
 * directly (combat resolver -> HUD, boss -> scene) communicate through here
 * instead of holding references to one another.
 */
export class EventBus<TEventMap> {
  private readonly listeners = new Map<keyof TEventMap, Set<Listener<any>>>();

  on<TEvent extends keyof TEventMap>(
    event: TEvent,
    listener: Listener<TEventMap[TEvent]>,
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => set!.delete(listener);
  }

  emit<TEvent extends keyof TEventMap>(event: TEvent, payload: TEventMap[TEvent]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      listener(payload);
    }
  }
}
