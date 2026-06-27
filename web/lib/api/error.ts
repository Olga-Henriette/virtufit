import { AxiosError } from "axios";

export function extractErrorMessage(
  error: unknown,
  fallback = "Une erreur est survenue. Réessayez.",
): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;

    if (data && typeof data === "object" && "message" in data) {
      const msg = (data as { message: unknown }).message;
      if (typeof msg === "string") return msg;
      if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
    }

    if (
      error.code === "ECONNABORTED" ||
      error.message.includes("timeout")
    ) {
      return "Le service prend plus de temps que prévu. Réessayez.";
    }

    switch (error.response?.status) {
      case 401:
        return "Email ou mot de passe incorrect.";
      case 404:
        return "Ressource introuvable.";
      case 409:
        return "Cette ressource existe déjà.";
      case 503:
        return "Service temporairement indisponible.";
      default:
        return fallback;
    }
  }

  return fallback;
}