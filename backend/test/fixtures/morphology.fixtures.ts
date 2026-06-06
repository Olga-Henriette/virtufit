import { CreateMeasurementDto } from '../../src/modules/measurements/dto';
import { GenerateAvatarDto } from '../../src/modules/avatar/dto';
import {
  SelectMorphotypeDto,
  MorphotypeCode,
} from '../../src/modules/avatar/dto';
import { GenderEnum } from '../../src/modules/avatar/dto';

// UUIDs stables pour tous les tests
export const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174000';
export const TEST_AVATAR_ID = 'avatar-fixture-001';
export const TEST_CLOTH_ID = '323e4567-e89b-12d3-a456-426614174002';

// Jeux de mensurations

export const VALID_MEASUREMENTS: CreateMeasurementDto = {
  heightCm: 175.5,
  weightKg: 70.0,
  chestCm: 95.0,
  waistCm: 80.0,
  hipsCm: 98.0,
  shoulderWidthCm: 45.0,
  inseamCm: 80.0,
  neckCm: 38.0,
  armLengthCm: 62.0,
  thighCm: 58.0,
};

export const MINIMAL_MEASUREMENTS: CreateMeasurementDto = {
  heightCm: 160.0,
  weightKg: 55.0,
  chestCm: 84.0,
  waistCm: 68.0,
  hipsCm: 90.0,
  shoulderWidthCm: 36.0,
};

export const INVALID_MEASUREMENTS_BELOW_MIN = {
  heightCm: 30.0, // < 50 → invalide
  weightKg: 70.0,
  chestCm: 95.0,
  waistCm: 80.0,
  hipsCm: 98.0,
  shoulderWidthCm: 45.0,
};

export const INVALID_MEASUREMENTS_ABOVE_MAX = {
  heightCm: 300.0, // > 250 → invalide
  weightKg: 70.0,
  chestCm: 95.0,
  waistCm: 80.0,
  hipsCm: 98.0,
  shoulderWidthCm: 45.0,
};

export const INVALID_MEASUREMENTS_MISSING_FIELDS = {
  heightCm: 175.0,
  weightKg: 70.0,
  // chestCm manquant → invalide
};

// Payloads de génération d'avatar

export const VALID_AVATAR_REQUEST: GenerateAvatarDto = {
  userId: TEST_USER_ID,
  measurements: {
    heightCm: 175.5,
    weightKg: 70.0,
    chestCm: 95.0,
    waistCm: 80.0,
    hipsCm: 98.0,
    shoulderWidthCm: 45.0,
    inseamCm: 80.0,
    gender: GenderEnum.NEUTRAL,
  },
};

export const VALID_MORPHOTYPE_REQUEST: SelectMorphotypeDto = {
  userId: TEST_USER_ID,
  morphotypeCode: MorphotypeCode.NEUTRAL_ATHLETIC,
  targetHeightCm: 178.0,
  targetWeightKg: 75.0,
};

// Valeurs limites (edge cases)

export const BOUNDARY_MEASUREMENTS_MIN: CreateMeasurementDto = {
  heightCm: 50.0, // min
  weightKg: 20.0, // min
  chestCm: 40.0,
  waistCm: 40.0,
  hipsCm: 40.0,
  shoulderWidthCm: 20.0,
};

export const BOUNDARY_MEASUREMENTS_MAX: CreateMeasurementDto = {
  heightCm: 250.0, // max
  weightKg: 300.0, // max
  chestCm: 200.0,
  waistCm: 200.0,
  hipsCm: 200.0,
  shoulderWidthCm: 80.0,
};
