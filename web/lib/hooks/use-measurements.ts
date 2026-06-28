"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { measurementsService } from "@/lib/api/measurements.service";
import type { MeasurementInput } from "@/lib/types";

export function useActiveMeasurement(userId: string | undefined) {
  return useQuery({
    queryKey: ["measurements", "active", userId],
    queryFn: () => measurementsService.getActive(userId!),
    enabled: !!userId,
  });
}

export function useCreateMeasurement(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MeasurementInput) =>
      measurementsService.create(userId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements", "active", userId] });
    },
  });
}