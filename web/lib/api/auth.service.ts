import { apiClient } from "./client";
import type { AuthResult, LoginPayload, RegisterPayload, User } from "@/lib/types";

interface ApiEnvelope<T> {
  data: T;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResult> {
    const { data } = await apiClient.post<ApiEnvelope<AuthResult>>(
      "/auth/login",
      payload,
    );
    return data.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResult> {
    const { data } = await apiClient.post<ApiEnvelope<AuthResult>>(
      "/auth/register",
      payload,
    );
    return data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout").catch(() => {
      // Logout local même si le backend échoue
    });
  },

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<ApiEnvelope<User>>("/auth/me");
    return data.data;
  },
};