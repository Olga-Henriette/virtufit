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

import {
  TryOnSession,
  SessionStatus,
} from '../session/entities/try-on-session.entity';
import { Avatar, AvatarDocument } from '../avatar/schemas/avatar.schema';
import {
  Clothing,
  ClothingDocument,
} from '../catalogue/schemas/clothing.schema';

import {
  StartTryOnDto,
  TryOnResponseDto,
  FitAnalysisResponseDto,
  TensionZoneResponseDto,
} from './dto';

// Interfaces de typage strict pour la simulation externe
interface SimTensionZone {
  zone_name: string;
  tension_level: string;
  tension_value: number;
  recommendation?: string | null;
}

interface SimFitAnalysis {
  overall_fit: string;
  fit_score: number;
  recommendations: string[];
  size_suggestion?: string | null;
  tension_zones: SimTensionZone[];
}

interface SimulationResultPayload {
  frame_count: number;
  simulation_ms: number;
  fit_analysis: SimFitAnalysis;
}

@Injectable()
export class TryOnService {
  private readonly logger = new Logger(TryOnService.name);
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

  /**
   * Pipeline principal d'essayage virtuel
   */
  async startTryOn(dto: StartTryOnDto): Promise<TryOnResponseDto> {
    this.logger.log(
      `Starting try-on pipeline — user=${dto.userId} avatar=${dto.avatarId} clothing=${dto.clothingId}`,
    );

    // 1. Chargement des données sources en parallèle
    const [avatar, clothing] = await Promise.all([
      this._loadAvatar(dto.userId, dto.avatarId),
      this._loadClothing(dto.clothingId),
    ]);

    // 2. Initialisation de la session de suivi dans PostgreSQL
    const session = await this._createSession(dto, avatar);

    try {
      // 3. Exécution de la simulation physique sur le service IA
      const simResult = await this._callSimulation(
        session.id,
        dto,
        avatar,
        clothing,
      );

      // 4. Finalisation de la session avec persistance des indicateurs géométriques
      const completedSession = await this._completeSession(
        session.id,
        simResult,
      );

      this.logger.log(
        `Try-on pipeline completed successfully — session=${session.id} fitScore=${simResult.fit_analysis.fit_score}`,
      );

      return this.toResponseDto(completedSession, simResult);
    } catch (error) {
      await this._handleFailure(session.id, error);
      throw error;
    }
  }

  async findSession(sessionId: string): Promise<TryOnResponseDto> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    return this.sessionToDto(session);
  }

  async findUserHistory(
    userId: string,
    limit = 20,
  ): Promise<TryOnResponseDto[]> {
    const sessions = await this.sessionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return sessions.map((s) => this.sessionToDto(s));
  }

  // Data Loading Logic

  private async _loadAvatar(
    userId: string,
    avatarId: string,
  ): Promise<AvatarDocument> {
    const avatar = await this.avatarModel
      .findOne({
        userId: userId,
        avatarId: avatarId,
        isActive: true,
      })
      .exec(); // .exec() fournit une stack trace propre en cas d'erreur Mongoose

    if (!avatar) {
      throw new NotFoundException(
        `Avatar ${avatarId} was not found or is inactive for user ${userId}. Please generate an avatar first.`,
      );
    }
    return avatar;
  }

  private async _loadClothing(clothingId: string): Promise<ClothingDocument> {
    const clothing = await this.clothingModel
      .findOne({
        clothingId: clothingId,
        isActive: true,
      })
      .exec();

    if (!clothing) {
      throw new NotFoundException(
        `Clothing item ${clothingId} not found in catalog.`,
      );
    }
    return clothing;
  }

  // Session State Management

  private async _createSession(
    dto: StartTryOnDto,
    avatar: AvatarDocument,
  ): Promise<TryOnSession> {
    const session = this.sessionRepo.create({
      userId: dto.userId,
      avatarId: avatar.avatarId,
      clothingId: dto.clothingId,
      animationType: (dto.animationType ??
        'standing') as unknown as TryOnSession['animationType'],
      status: SessionStatus.PROCESSING,
    });
    return this.sessionRepo.save(session);
  }

  private async _completeSession(
    sessionId: string,
    simResult: SimulationResultPayload,
  ): Promise<TryOnSession> {
    const tensionZones =
      simResult.fit_analysis.tension_zones?.map((z: SimTensionZone) => ({
        zone_name: z.zone_name,
        tension_level: z.tension_level,
        tension_value: z.tension_value,
      })) ?? [];

    await this.sessionRepo.update(sessionId, {
      status: SessionStatus.COMPLETED,
      fitScore: simResult.fit_analysis.fit_score,
      overallFit: simResult.fit_analysis.overall_fit,
      tensionZones,
      simulationMs: Math.round(simResult.simulation_ms),
      simulationResult: {
        frameCount: simResult.frame_count,
        fitAnalysis: simResult.fit_analysis,
        simulationMs: simResult.simulation_ms,
      },
      completedAt: new Date(),
    });

    const updated = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!updated) {
      throw new NotFoundException(
        `Session ${sessionId} disappeared post-update`,
      );
    }
    return updated;
  }

  private async _handleFailure(
    sessionId: string,
    error: unknown,
  ): Promise<void> {
    const message =
      error instanceof Error ? error.message : 'Unknown AI simulation error';
    this.logger.error(`Simulation failed for session ${sessionId}: ${message}`);

    await this.sessionRepo
      .update(sessionId, {
        status: SessionStatus.FAILED,
        errorMessage: message,
        completedAt: new Date(),
      })
      .catch((err: unknown) => {
        const logMessage =
          err instanceof Error ? err.message : 'Unknown logger error';
        this.logger.error(
          `Failed to record session failure state: ${logMessage}`,
        );
      });
  }

  // External AI Orchestration

  private async _callSimulation(
    sessionId: string,
    dto: StartTryOnDto,
    avatar: AvatarDocument,
    clothing: ClothingDocument,
  ): Promise<SimulationResultPayload> {
    const url = `${this.aiServiceUrl}/api/v1/simulation/run`;

    const payload = {
      session_id: sessionId,
      user_id: dto.userId,
      animation_type: dto.animationType ?? 'standing',
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
          stiffness: this._fabricToStiffness(clothing.fabricType),
          damping: 0.015,
        },
      },
    };

    try {
      // Transition vers l'API Fetch native standardisée avec un timeout de protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s max timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorDetail = await response.text();
        throw new ServiceUnavailableException(
          `AI Engine responded with an error: ${errorDetail}`,
        );
      }

      return (await response.json()) as SimulationResultPayload;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'name' in err &&
        err.name === 'AbortError'
      ) {
        throw new ServiceUnavailableException(
          'AI Engine processing timed out after 60 seconds.',
        );
      }
      if (err instanceof ServiceUnavailableException) throw err;
      throw new ServiceUnavailableException(
        'AI Engine is currently unreachable. Ensure it runs on port 8000.',
      );
    }
  }

  private _fabricToStiffness(fabricType: string): number {
    const stiffnessMap: Record<string, number> = {
      cotton: 0.35,
      denim: 0.75,
      wool: 0.3,
      silk: 0.1,
      polyester: 0.2,
      linen: 0.6,
      unknown: 0.35,
    };
    return stiffnessMap[fabricType] ?? stiffnessMap.unknown;
  }

  // DTO Mapping Layer

  private toResponseDto(
    session: TryOnSession,
    simResult: SimulationResultPayload,
  ): TryOnResponseDto {
    const dto = new TryOnResponseDto();
    dto.sessionId = session.id;
    dto.userId = session.userId;
    dto.clothingId = session.clothingId;
    dto.avatarId = session.avatarId;
    dto.status = session.status;
    dto.animationType = session.animationType;
    dto.frameCount = simResult.frame_count ?? 0;
    dto.simulationMs = simResult.simulation_ms ?? 0;
    dto.createdAt = session.createdAt;
    dto.completedAt = session.completedAt ?? new Date();
    dto.fitAnalysis = this.toFitAnalysisDto(simResult.fit_analysis);
    return dto;
  }

  private sessionToDto(session: TryOnSession): TryOnResponseDto {
    const dto = new TryOnResponseDto();
    dto.sessionId = session.id;
    dto.userId = session.userId;
    dto.clothingId = session.clothingId;
    dto.avatarId = session.avatarId;
    dto.status = session.status;
    dto.animationType = session.animationType;

    const resultObj = session.simulationResult as {
      frameCount?: number;
    } | null;
    dto.frameCount = resultObj?.frameCount ?? 0;

    dto.simulationMs = session.simulationMs ?? 0;
    dto.createdAt = session.createdAt;
    dto.completedAt = session.completedAt ?? session.createdAt;
    dto.fitAnalysis = this.toFitAnalysisFromSession(session);
    return dto;
  }

  private toFitAnalysisDto(fitData: SimFitAnalysis): FitAnalysisResponseDto {
    const dto = new FitAnalysisResponseDto();
    dto.overallFit = fitData?.overall_fit ?? 'unknown';
    dto.fitScore = fitData?.fit_score ?? 0;
    dto.recommendations = fitData?.recommendations ?? [];
    dto.sizeSuggestion = fitData?.size_suggestion ?? null;
    dto.tensionZones = (fitData?.tension_zones ?? []).map(
      (z: SimTensionZone): TensionZoneResponseDto => ({
        zoneName: z.zone_name,
        tensionLevel: z.tension_level,
        tensionValue: z.tension_value,
        recommendation: z.recommendation ?? null,
      }),
    );
    return dto;
  }

  private toFitAnalysisFromSession(
    session: TryOnSession,
  ): FitAnalysisResponseDto {
    const dto = new FitAnalysisResponseDto();
    dto.overallFit = session.overallFit ?? 'unknown';
    dto.fitScore = session.fitScore ? Number(session.fitScore) : 0;
    dto.recommendations = [];
    dto.sizeSuggestion = null;

    // Définition d'un type local strict reflétant la structure de tensionZones en DB
    const sessionZones = (session.tensionZones ?? []) as Array<{
      zone_name?: unknown;
      tension_level?: unknown;
      tension_value?: unknown;
    }>;

    dto.tensionZones = sessionZones.map(
      (z): TensionZoneResponseDto => ({
        zoneName: typeof z.zone_name === 'string' ? z.zone_name : '',
        tensionLevel:
          typeof z.tension_level === 'string' ? z.tension_level : 'low',
        tensionValue: typeof z.tension_value === 'number' ? z.tension_value : 0,
        recommendation: null,
      }),
    );
    return dto;
  }
}
