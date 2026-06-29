import { apiClient } from "./client";
import type { Avatar, MeasurementInput, Gender } from "@/lib/types";

interface GenerateAvatarPayload {
  userId: string;
  measurements: MeasurementInput & { gender?: Gender };
}

export const avatarService = {
  async generate(payload: GenerateAvatarPayload): Promise<Avatar> {
    const { data } = await apiClient.post<Avatar>("/avatars/generate", payload);
    return data;
  },

  async getActive(userId: string): Promise<Avatar | null> {
    try {
      const { data } = await apiClient.get<Avatar>(`/avatars/users/${userId}/active`);
      return data;
    } catch {
      return null;
    }
  },

  async getHistory(userId: string): Promise<Avatar[]> {
    const { data } = await apiClient.get<Avatar[]>(`/avatars/users/${userId}/history`);
    return data;
  },
};