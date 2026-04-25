import { request } from "./client";
import type {
  AuthResponse,
  CurrentUser,
  ForgotPasswordPayload,
  OAuthAuthorizeResponse,
  RegisterPayload,
  UpdateProfilePayload,
} from "./types";

export const authApi = {
  login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
  },

  register(payload: RegisterPayload): Promise<{ message: string; user_id: number }> {
    return request("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  me(): Promise<CurrentUser> {
    return request<CurrentUser>("/auth/me");
  },

  updateProfile(payload: UpdateProfilePayload): Promise<{ message: string }> {
    return request("/auth/profiles", { method: "PATCH", body: payload });
  },

  forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    return request("/auth/forgot-password", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  oauthAuthorizeUrl(provider: "line" | "google"): Promise<OAuthAuthorizeResponse> {
    return request<OAuthAuthorizeResponse>(
      `/auth/oauth/${provider}/authorize-url?state=${provider}`,
      { auth: false }
    );
  },


  oauthCallback(provider: string, code: string, state: string): Promise<AuthResponse> {
    return request<AuthResponse>(
      `/auth/oauth/${provider}/callback?code=${code}&state=${state}`,
      { auth: false }
    );
  },
};

