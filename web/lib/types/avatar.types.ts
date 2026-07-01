export type Gender = "male" | "female" | "neutral";

export interface MeasurementInput {
  heightCm: number;
  weightKg: number;
  chestCm: number;
  waistCm: number;
  hipsCm: number;
  shoulderWidthCm: number;
  inseamCm?: number;
  neckCm?: number;
  armLengthCm?: number;
  thighCm?: number;
}

export interface Measurement extends MeasurementInput {
  id: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
}

export type MorphotypeCode =
  | "male_ectomorph"
  | "male_mesomorph"
  | "male_endomorph"
  | "female_hourglass"
  | "female_pear"
  | "female_apple"
  | "female_rectangle"
  | "neutral_average"
  | "neutral_athletic";

export interface SmplParameters {
  betas: number[];
  thetas: number[];
}

export interface AvatarMesh {
  verticesCount: number;
  facesCount: number;
  meshFormat: string;
  meshReference: string;
}

export interface Avatar {
  avatarId: string;
  userId: string;
  smplParameters: SmplParameters;
  mesh: AvatarMesh;
  bmi: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  generationTimeMs: number;
  isActive: boolean;
  createdAt: string;
  skinTone?: string;
  hairColor?: string;
  skinRgb?: number[];
  hairRgb?: number[];
}