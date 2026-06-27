export type ClothingCategory =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "underwear";

export interface ColorInfo {
  dominantRgb: number[];
  palette: number[][];
  isPatterned: boolean;
  patternType: string | null;
}

export interface ContourInfo {
  boundingWidthPx: number;
  boundingHeightPx: number;
  contourAreaPx: number;
  aspectRatio: number;
  symmetryScore: number;
}

export interface Clothing {
  clothingId: string;
  vendorId: string;
  name: string;
  category: ClothingCategory;
  fabricType: string;
  estimatedSize: string;
  colorInfo: ColorInfo;
  contourInfo: ContourInfo;
  elasticityCoeff: number;
  frictionCoeff: number;
  meshReference: string | null;
  textureReference: string | null;
  isDigitized: boolean;
  digitizationMs: number;
  createdAt: string;
}