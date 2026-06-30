"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { avatarService } from "@/lib/api/avatar.service";
import type { Gender, MeasurementInput } from "@/lib/types";

export function useActiveAvatar(userId: string | undefined) {
  return useQuery({
    queryKey: ["avatar", "active", userId],
    queryFn: () => avatarService.getActive(userId!),
    enabled: !!userId,
  });
}

export function useGenerateAvatar(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (measurements: MeasurementInput & { gender?: Gender }) =>
      avatarService.generate({ userId: userId!, measurements }),
    onSuccess: (newAvatar) => {
      // Met à jour directement le cache avec la nouvelle donnée plutôt
      // que d'attendre un refetch, pour un effet immédiat sans reload.
      queryClient.setQueryData(["avatar", "active", userId], newAvatar);
      queryClient.invalidateQueries({ queryKey: ["avatar", "active", userId] });
    },
  });
}