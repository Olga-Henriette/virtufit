"use client";

import { useEffect, useState } from "react";

/**
 * Retourne une version "retardée" d'une valeur, qui ne se met à jour
 * qu'après que la valeur source soit restée stable pendant `delayMs`.
 * Utile pour éviter de recalculer des opérations coûteuses (ex: déformation
 * de géométrie 3D) à chaque frappe clavier.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}