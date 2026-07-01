import { apiClient } from "./client";
import type { PersonalizationResult } from "@/lib/types";

export const personalizationService = {
  async uploadPhoto(
    userId: string,
    file: File,
  ): Promise<PersonalizationResult> {
    const formData = new FormData();
    formData.append("photo", file);

    const { data } = await apiClient.post<PersonalizationResult>(
      `/avatars/personalization/users/${userId}/photo`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },
};