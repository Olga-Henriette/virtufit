/**
 * Convertit un triplet RGB (0-255) en couleur hexadécimale CSS,
 * utilisable directement comme `color` d'un MeshStandardMaterial Three.js.
 */
export function rgbToHex(rgb: number[] | undefined): string | null {
  if (!rgb || rgb.length < 3) return null;
  const [r, g, b] = rgb;
  const toHex = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const DEFAULT_SKIN_COLOR = "#d9a583";