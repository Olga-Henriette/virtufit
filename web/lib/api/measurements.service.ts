import { apiClient } from "./client";
import type { Measurement, MeasurementInput } from "@/lib/types";

interface ApiEnvelope<T> {
  data: T;
}

export const measurementsService = {
  async create(userId: string, payload: MeasurementInput): Promise<Measurement> {
    const { data } = await apiClient.post<ApiEnvelope<Measurement>>(
      `/measurements/users/${userId}`,
      payload,
    );
    return data.data;
  },

  async getActive(userId: string): Promise<Measurement | null> {
    try {
      const { data } = await apiClient.get<Measurement>(
        `/measurements/users/${userId}/active`,
      );
      return data;
    } catch {
      return null;
    }
  },

  async getHistory(userId: string): Promise<Measurement[]> {
    const { data } = await apiClient.get<Measurement[]>(
      `/measurements/users/${userId}/history`,
    );
    return data;
  },
};