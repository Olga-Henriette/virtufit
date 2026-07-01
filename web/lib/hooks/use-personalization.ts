"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { personalizationService } from "@/lib/api/personalization.service";

export function useUploadPersonalizationPhoto(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => personalizationService.uploadPhoto(userId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avatar", "active", userId] });
    },
  });
}