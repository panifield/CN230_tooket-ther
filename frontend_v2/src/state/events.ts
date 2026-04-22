export type LogLevel = "info" | "warn" | "error";

export interface EventMap {
  log: { level: LogLevel; message: string };
  "auth:login": { user_id: number };
  "auth:logout": undefined;
  "route:change": { path: string };
}

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;
type AnyHandler = (payload: unknown) => void;

class EventBus {
  private readonly listeners = new Map<keyof EventMap, Set<AnyHandler>>();

  on<K extends keyof EventMap>(event: K, handler: Handler<K>): () => void {
    const set = this.listeners.get(event) ?? new Set<AnyHandler>();
    set.add(handler as AnyHandler);
    this.listeners.set(event, set);
    return () => {
      set.delete(handler as AnyHandler);
    };
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      (handler as Handler<K>)(payload);
    }
  }
}

export const events = new EventBus();
