import { create } from "zustand";
import type { Avatar, MeasurementInput } from "@/lib/types";

interface AvatarSnapshot {
  avatar: Avatar;
  measurements: MeasurementInput;
  label: string;
  savedAt: string;
}

interface AvatarHistoryState {
  previous: AvatarSnapshot | null;
  current: AvatarSnapshot | null;
  viewMode: "current" | "previous" | "neutral";
  saveSnapshot: (avatar: Avatar, measurements: MeasurementInput) => void;
  toggleComparison: () => void;
  resetToNeutral: () => void;
}

export const useAvatarHistoryStore = create<AvatarHistoryState>((set, get) => ({
  previous: null,
  current: null,
  viewMode: "current",

  saveSnapshot: (avatar, measurements) => {
    const { current } = get();
    set({
      previous: current,
      current: {
        avatar,
        measurements,
        label: new Date().toLocaleTimeString("fr-FR"),
        savedAt: new Date().toISOString(),
      },
      viewMode: "current",
    });
  },

  toggleComparison: () =>
    set((s) => ({
      viewMode: s.viewMode === "current" ? "previous" : "current",
    })),

  resetToNeutral: () => set({ viewMode: "neutral" }),
}));