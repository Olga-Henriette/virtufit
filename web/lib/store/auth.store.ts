import { create } from "zustand";
import type { User } from "@/lib/types";
import { tokenStorage } from "@/lib/api/client";

type AuthStatus = "unknown" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  setAuthenticated: (user: User, accessToken: string, refreshToken: string) => void;
  setUnauthenticated: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "unknown",
  user: null,

  setAuthenticated: (user, accessToken, refreshToken) => {
    tokenStorage.setTokens(accessToken, refreshToken);
    set({ status: "authenticated", user });
  },

  setUnauthenticated: () => {
    tokenStorage.clear();
    set({ status: "unauthenticated", user: null });
  },

  setUser: (user) => set({ user }),
}));