import type { Gender } from "@/lib/types";

export const AVATAR_BASE_MODELS: Record<Gender, string> = {
  male: "/models/avatar-base-male.glb",
  female: "/models/avatar-base-female.glb",
  neutral: "/models/avatar-base-male.glb", // fallback neutre
};

export function getAvatarModelPath(gender: Gender | string | undefined): string {
  const key = (gender as Gender) in AVATAR_BASE_MODELS ? (gender as Gender) : "neutral";
  return AVATAR_BASE_MODELS[key];
}