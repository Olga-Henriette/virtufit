"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth.store";
import { authService } from "@/lib/api/auth.service";
import { tokenStorage } from "@/lib/api/client";

/**
 * Restaure la session utilisateur au chargement initial de l'app.
 */
export function useInitAuth() {
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const setUnauthenticated = useAuthStore((s) => s.setUnauthenticated);
  const status = useAuthStore((s) => s.status);

  const [isInitializing, setIsInitializing] = useState(status === "unknown");

  useEffect(() => {
    if (status !== "unknown") {
      return;
    }

    let cancelled = false;

    async function restore() {
      const accessToken = tokenStorage.getAccessToken();
      const refreshToken = tokenStorage.getRefreshToken();

      if (!accessToken || !refreshToken) {
        if (!cancelled) {
          setUnauthenticated();
          setIsInitializing(false);
        }
        return;
      }

      try {
        const user = await authService.getProfile();
        if (!cancelled) {
          setAuthenticated(user, accessToken, refreshToken);
        }
      } catch {
        if (!cancelled) {
          setUnauthenticated();
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [setAuthenticated, setUnauthenticated, status]);

  const currentInitializing = status === "unknown" ? isInitializing : false;

  return { isInitializing: currentInitializing };
}