export interface PersonalizationResult {
  avatarId: string;
  userId: string;
  photoReference: string;
  skinTone: string;
  hairColor: string;
  skinRgb: number[];
  hairRgb: number[];
  confidenceScore: number;
  updatedAt: string;
}