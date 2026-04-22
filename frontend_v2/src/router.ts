import { events } from "./state/events";

export type RouteHandler = () => Promise<void> | void;

export interface Route {
  path: string;
  handler: RouteHandler;
  /** If true, redirect anonymous users to /login */
  authRequired?: boolean;
}

export class HashRouter {
  private readonly routes: Route[] = [];
  private fallback: RouteHandler = () => {};

  register(route: Route): this {
    this.routes.push(route);
    return this;
  }

  setFallback(handler: RouteHandler): this {
    this.fallback = handler;
    return this;
  }

  start(): void {
    window.addEventListener("hashchange", () => void this.dispatch());
    void this.dispatch();
  }

  navigate(path: string): void {
    if (window.location.hash !== `#${path}`) {
      window.location.hash = path;
    } else {
      void this.dispatch();
    }
  }

  current(): string {
    return window.location.hash.replace(/^#/, "") || "/";
  }

  private async dispatch(): Promise<void> {
    const path = this.current();
    events.emit("route:change", { path });
    const route = this.routes.find((r) => r.path === path);
    if (route) {
      await route.handler();
    } else {
      await this.fallback();
    }
  }
}

export const router = new HashRouter();
