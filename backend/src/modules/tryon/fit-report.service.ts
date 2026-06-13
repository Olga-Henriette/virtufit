import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';

import { TryOnSession } from '../session/entities/try-on-session.entity';
import { Avatar, AvatarDocument } from '../avatar/schemas/avatar.schema';
import {
  Clothing,
  ClothingDocument,
} from '../catalogue/schemas/clothing.schema';
import { FitReportDto, ZoneAnalysisDto } from './dto';

type AiZoneAnalysis = {
  zone: string;
  tension_value: number;
  tension_level: string;
  fit_delta_cm: number;
  is_constraining: boolean;
  recommendation?: string | null;
};

type AiFitAnalysisResponse = {
  user_id?: string;
  clothing_id?: string;
  overall_score?: number;
  fit_category?: string;
  comfort_score?: number;
  mobility_score?: number;
  summary?: string;
  recommendations?: string[];
  style_tips?: string[];
  fabric_type?: string;
  simulation_ms?: number;
  zone_analyses?: AiZoneAnalysis[];
  size_comparison?: {
    current_size?: string;
    suggested_size?: string | null;
    size_down?: string | null;
    size_up?: string | null;
    confidence?: number;
  };
};

@Injectable()
export class FitReportService {
  private readonly logger = new Logger(FitReportService.name);
  private readonly aiServiceUrl: string;

  constructor(
    @InjectRepository(TryOnSession)
    private readonly sessionRepo: Repository<TryOnSession>,

    @InjectModel(Avatar.name)
    private readonly avatarModel: Model<AvatarDocument>,

    @InjectModel(Clothing.name)
    private readonly clothingModel: Model<ClothingDocument>,

    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  // Rapport détaillé pour une session
  async generateReport(sessionId: string): Promise<FitReportDto> {
    this.logger.log(`Génération rapport — session=${sessionId}`);

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} introuvable`);
    }

    const avatar = await this.avatarModel.findOne({
      userId: session.userId,
      avatarId: session.avatarId,
    });
    const clothing = await this.clothingModel.findOne({
      clothingId: session.clothingId,
    });

    if (!avatar || !clothing) {
      throw new NotFoundException(
        'Avatar ou vêtement introuvable pour générer le rapport.',
      );
    }

    // Appel vers AI Services pour l'analyse détaillée
    const aiReport = await this._callFitAnalysis(session, avatar, clothing);

    return this.toReportDto(aiReport, sessionId);
  }

  // Comparaison de tailles
  async compareSizes(
    sessionId: string,
    sizes: string[],
  ): Promise<Record<string, FitReportDto>> {
    this.logger.log(
      `Comparaison tailles — session=${sessionId} sizes=${sizes.join(',')}`,
    );

    const results: Record<string, FitReportDto> = {};

    for (const size of sizes) {
      try {
        const report = await this.generateReport(sessionId);
        results[size] = {
          ...report,
          sizeComparison: { ...report.sizeComparison, currentSize: size },
        };
      } catch {
        this.logger.warn(
          `Impossible de générer le rapport pour taille ${size}`,
        );
      }
    }

    return results;
  }

  // Appel AI Services
  private async _callFitAnalysis(
    session: TryOnSession,
    avatar: AvatarDocument,
    clothing: ClothingDocument,
  ): Promise<AiFitAnalysisResponse> {
    const url = `${this.aiServiceUrl}/api/v1/fit-analysis/analyze`;

    const payload = {
      simulation: {
        session_id: session.id,
        user_id: session.userId,
        animation_type: session.animationType,
        avatar: {
          avatar_id: avatar.avatarId,
          smpl_betas: avatar.smplBetas,
          height_cm: avatar.heightCm,
          weight_kg: avatar.weightKg,
        },
        clothing: {
          clothing_id: clothing.clothingId,
          mesh_reference:
            clothing.meshReference ??
            `meshes/clothing/${clothing.clothingId}.glb`,
          category: clothing.category,
          fabric: {
            fabric_type: clothing.fabricType,
            elasticity_coeff: clothing.elasticityCoeff,
            friction_coeff: clothing.frictionCoeff,
            weight_per_sqm: clothing.weightPerSqm,
            stiffness: this._stiffnessFor(clothing.fabricType),
            damping: 0.015,
          },
        },
      },
      measurements: {
        height_cm: avatar.heightCm,
        weight_kg: avatar.weightKg,
        chest_cm: 90.0,
        waist_cm: 76.0,
        hips_cm: 92.0,
        shoulder_width_cm: 41.0,
      },
      clothing_id: clothing.clothingId,
      category: clothing.category,
      current_size: clothing.estimatedSize ?? 'M',
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new ServiceUnavailableException(`AI fit-analysis error: ${err}`);
      }

      return response.json() as AiFitAnalysisResponse;
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new ServiceUnavailableException('AI Service indisponible.');
    }
  }

  private _stiffnessFor(fabricType: string): number {
    const map: Record<string, number> = {
      cotton: 0.35,
      denim: 0.75,
      wool: 0.3,
      silk: 0.1,
      polyester: 0.2,
      linen: 0.6,
      unknown: 0.35,
    };
    return map[fabricType] ?? 0.35;
  }

  // Mapper
  private toReportDto(
    ai: AiFitAnalysisResponse,
    sessionId: string,
  ): FitReportDto {
    const dto = new FitReportDto();
    dto.sessionId = sessionId;
    dto.userId = ai.user_id ?? '';
    dto.clothingId = ai.clothing_id ?? '';
    dto.overallScore = ai.overall_score ?? 0;
    dto.fitCategory = ai.fit_category ?? 'unknown';
    dto.comfortScore = ai.comfort_score ?? 0;
    dto.mobilityScore = ai.mobility_score ?? 0;
    dto.summary = ai.summary ?? '';
    dto.recommendations = ai.recommendations ?? [];
    dto.styleTips = ai.style_tips ?? [];
    dto.fabricType = ai.fabric_type ?? '';
    dto.simulationMs = ai.simulation_ms ?? 0;
    dto.analyzedAt = new Date();

    dto.zoneAnalyses = (ai.zone_analyses ?? []).map(
      (z): ZoneAnalysisDto => ({
        zone: z.zone,
        tensionValue: z.tension_value,
        tensionLevel: z.tension_level,
        fitDeltaCm: z.fit_delta_cm,
        isConstraining: z.is_constraining,
        recommendation: z.recommendation ?? null,
      }),
    );

    const sc = ai.size_comparison ?? {};
    dto.sizeComparison = {
      currentSize: sc.current_size ?? 'M',
      suggestedSize: sc.suggested_size ?? null,
      sizeDown: sc.size_down ?? null,
      sizeUp: sc.size_up ?? null,
      confidence: sc.confidence ?? 0.7,
    };

    return dto;
  }
}
