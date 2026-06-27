export type AnimationType = "standing" | "walking" | "rotating";

export interface TensionZone {
  zoneName: string;
  tensionLevel: "none" | "low" | "medium" | "high" | "critical";
  tensionValue: number;
  recommendation: string | null;
}

export interface FitAnalysis {
  overallFit: string;
  fitScore: number;
  tensionZones: TensionZone[];
  recommendations: string[];
  sizeSuggestion: string | null;
}

export interface TryOnSession {
  sessionId: string;
  userId: string;
  clothingId: string;
  avatarId: string;
  status: "initiated" | "processing" | "completed" | "failed";
  animationType: AnimationType;
  fitAnalysis: FitAnalysis;
  frameCount: number;
  simulationMs: number;
  createdAt: string;
  completedAt: string;
}

export interface ZoneAnalysis {
  zone: string;
  tensionValue: number;
  tensionLevel: "none" | "low" | "medium" | "high" | "critical";
  fitDeltaCm: number;
  isConstraining: boolean;
  recommendation: string | null;
}

export interface SizeComparison {
  currentSize: string;
  suggestedSize: string | null;
  sizeDown: string | null;
  sizeUp: string | null;
  confidence: number;
}

export interface FitReport {
  sessionId: string;
  userId: string;
  clothingId: string;
  overallScore: number;
  fitCategory: "perfect" | "good" | "acceptable" | "tight" | "loose";
  comfortScore: number;
  mobilityScore: number;
  zoneAnalyses: ZoneAnalysis[];
  sizeComparison: SizeComparison;
  summary: string;
  recommendations: string[];
  styleTips: string[];
  fabricType: string;
  simulationMs: number;
  analyzedAt: string;
}