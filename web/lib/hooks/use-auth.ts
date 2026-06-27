"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth.store";
import { authService } from "@/lib/api/auth.service";
import { extractErrorMessage } from "@/lib/api/error";
import type { LoginPayload, RegisterPayload } from "@/lib/types";

export function useAuth() {
  const router = useRouter();
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(payload: LoginPayload) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authService.login(payload);
      setAuthenticated(result.user, result.accessToken, result.refreshToken);
      router.push("/home");
    } catch (err) {
      setError(extractErrorMessage(err, "Email ou mot de passe incorrect."));
    } finally {
      setIsLoading(false);
    }
  }

  async function register(payload: RegisterPayload) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authService.register(payload);
      setAuthenticated(result.user, result.accessToken, result.refreshToken);
      router.push("/home");
    } catch (err) {
      setError(extractErrorMessage(err, "Inscription impossible. Réessayez."));
    } finally {
      setIsLoading(false);
    }
  }

  return { login, register, isLoading, error, clearError: () => setError(null) };
}