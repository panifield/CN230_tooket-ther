import type { AuthResponse, CurrentUser, Role } from "../api/types";

const TOKEN_KEY = "tooket.token";
const USER_KEY = "tooket.user";

class AuthStore {
  private token: string | null = null;
  private user: CurrentUser | null = null;

  constructor() {
    const t = localStorage.getItem(TOKEN_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (t) this.token = t;
    if (u) {
      try {
        this.user = JSON.parse(u) as CurrentUser;
      } catch {
        this.user = null;
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): CurrentUser | null {
    return this.user;
  }

  getRole(): Role | null {
    return this.user?.role ?? null;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  setSession(auth: AuthResponse): void {
    this.token = auth.access_token;
    localStorage.setItem(TOKEN_KEY, auth.access_token);
  }

  setUser(user: CurrentUser): void {
    this.user = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export const authStore = new AuthStore();
