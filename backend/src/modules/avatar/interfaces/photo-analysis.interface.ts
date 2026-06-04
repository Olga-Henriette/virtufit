export interface PhotoAnalysisResult {
  user_id: string;
  photo_reference: string;

  visual_features: {
    skin_tone: string;
    hair_color: string;
    skin_rgb: number[];
    hair_rgb: number[];
    confidence_score: number;
  };

  analysis_time_ms: number;
}
