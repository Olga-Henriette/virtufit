import type { MeasurementInput } from "@/lib/types";

type ReferenceKeys = "heightCm" | "chestCm" | "waistCm" | "hipsCm" | "shoulderWidthCm";

/**
 * Mensurations de référence — utilisées comme base 1.0 pour calculer
 * les facteurs d'échelle relatifs de chaque région anatomique.
 * Correspond approximativement à un adulte de taille moyenne (170cm).
 */
const REFERENCE_MEASUREMENTS: Record<ReferenceKeys, number> = {
  heightCm: 170,
  chestCm: 90,
  waistCm: 76,
  hipsCm: 92,
  shoulderWidthCm: 41,
};

/** Bornes de sécurité par défaut pour éviter des déformations absurdes. */
const DEFAULT_CLAMP_MIN = 0.75;
const DEFAULT_CLAMP_MAX = 1.35;

export interface BodyRegionScale {
  height: number;
  chest: number;
  waist: number;
  /** Échelle horizontale des hanches */
  hips: number;
  shoulders: number;
}

function clamp(
  value: number,
  min: number = DEFAULT_CLAMP_MIN,
  max: number = DEFAULT_CLAMP_MAX,
): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Calcule les facteurs d'échelle par région anatomique à partir
 * des mensurations réelles de l'utilisateur, relativement à un corps
 * de référence. Chaque facteur est indépendant et clampé pour rester
 * visuellement plausible quelle que soit l'entrée utilisateur.
 */
export function computeBodyRegionScale(
  measurements: Partial<MeasurementInput>,
): BodyRegionScale {
  const heightCm = measurements.heightCm ?? REFERENCE_MEASUREMENTS.heightCm;
  const chestCm = measurements.chestCm ?? REFERENCE_MEASUREMENTS.chestCm;
  const waistCm = measurements.waistCm ?? REFERENCE_MEASUREMENTS.waistCm;
  const hipsCm = measurements.hipsCm ?? REFERENCE_MEASUREMENTS.hipsCm;
  const shoulderWidthCm =
    measurements.shoulderWidthCm ?? REFERENCE_MEASUREMENTS.shoulderWidthCm;

  return {
    height: clamp(heightCm / REFERENCE_MEASUREMENTS.heightCm, 0.7, 1.3),
    chest: clamp(chestCm / REFERENCE_MEASUREMENTS.chestCm),
    waist: clamp(waistCm / REFERENCE_MEASUREMENTS.waistCm),
    hips: clamp(hipsCm / REFERENCE_MEASUREMENTS.hipsCm),
    shoulders: clamp(shoulderWidthCm / REFERENCE_MEASUREMENTS.shoulderWidthCm, 0.85, 1.2),
  };
}

export const NEUTRAL_BODY_SCALE: BodyRegionScale = {
  height: 1,
  chest: 1,
  waist: 1,
  hips: 1,
  shoulders: 1,
};