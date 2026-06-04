import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { Avatar, AvatarDocument } from './schemas/avatar.schema';
import {
  GenerateAvatarDto,
  AvatarResponseDto,
  SelectMorphotypeDto,
} from './dto';
import { AiAvatarResponse } from './dto';

@Injectable()
export class AvatarService {
  private readonly logger = new Logger(AvatarService.name);
  private readonly aiServiceUrl: string;

  constructor(
    @InjectModel(Avatar.name)
    private readonly avatarModel: Model<AvatarDocument>,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  // Générer un avatar via AI Services
  async generate(dto: GenerateAvatarDto): Promise<AvatarResponseDto> {
    this.logger.log(`Génération avatar — user=${dto.userId}`);

    // Appel vers AI Services
    const aiResponse = await this.callAiService(dto);

    // Désactive les anciens avatars actifs
    await this.avatarModel.updateMany(
      { userId: dto.userId, isActive: true },
      { $set: { isActive: false } },
    );

    // Sauvegarde dans MongoDB
    const created = await this.avatarModel.create({
      userId: dto.userId,
      avatarId: aiResponse.avatar_id,
      smplBetas: aiResponse.smpl_parameters.betas,
      smplThetas: aiResponse.smpl_parameters.thetas,
      meshReference: aiResponse.mesh.mesh_reference,
      meshFormat: aiResponse.mesh.mesh_format,
      verticesCount: aiResponse.mesh.vertices_count,
      facesCount: aiResponse.mesh.faces_count,
      heightCm: dto.measurements.heightCm,
      weightKg: dto.measurements.weightKg,
      bmi: aiResponse.bmi,
      gender: dto.measurements.gender ?? 'neutral',
      isActive: true,
      generationTimeMs: aiResponse.generation_time_ms,
    });

    this.logger.log(
      `Avatar ${created.avatarId} sauvegardé pour user=${dto.userId}`,
    );
    return this.toResponseDto(created);
  }

  // Récupérer l'avatar actif
  async findActiveByUserId(userId: string): Promise<AvatarResponseDto> {
    const avatar = await this.avatarModel
      .findOne({ userId, isActive: true })
      .sort({ created_at: -1 })
      .exec();

    if (!avatar) {
      throw new NotFoundException(
        `Aucun avatar actif trouvé pour l'utilisateur ${userId}`,
      );
    }

    return this.toResponseDto(avatar);
  }

  // Récupérer l'historique
  async findAllByUserId(userId: string): Promise<AvatarResponseDto[]> {
    const avatars = await this.avatarModel
      .find({ userId })
      .sort({ created_at: -1 })
      .exec();

    return avatars.map((a) => this.toResponseDto(a));
  }

  //  Générer depuis un morphotype
  async generateFromMorphotype(
    dto: SelectMorphotypeDto,
  ): Promise<AvatarResponseDto> {
    this.logger.log(
      `Génération depuis morphotype=${dto.morphotypeCode} user=${dto.userId}`,
    );

    const aiResponse = await this.callAiMorphotype(dto);

    await this.avatarModel.updateMany(
      { userId: dto.userId, isActive: true },
      { $set: { isActive: false } },
    );

    const created = await this.avatarModel.create({
      userId: dto.userId,
      avatarId: aiResponse.avatar_id,
      smplBetas: aiResponse.smpl_parameters.betas,
      smplThetas: aiResponse.smpl_parameters.thetas,
      meshReference: aiResponse.mesh.mesh_reference,
      meshFormat: aiResponse.mesh.mesh_format,
      verticesCount: aiResponse.mesh.vertices_count,
      facesCount: aiResponse.mesh.faces_count,
      heightCm: dto.targetHeightCm,
      weightKg: dto.targetWeightKg,
      bmi: aiResponse.bmi,
      gender: 'neutral',
      isActive: true,
      generationTimeMs: aiResponse.generation_time_ms,
    });

    return this.toResponseDto(created);
  }

  // Appel HTTP morphotype → AI Services
  private async callAiMorphotype(
    dto: SelectMorphotypeDto,
  ): Promise<AiAvatarResponse> {
    const url = `${this.aiServiceUrl}/api/v1/morphotypes/generate-avatar`;

    const payload = {
      user_id: dto.userId,
      morphotype_code: dto.morphotypeCode,
      target_height_cm: dto.targetHeightCm,
      target_weight_kg: dto.targetWeightKg,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ServiceUnavailableException(
          `AI Service — morphotype error: ${error}`,
        );
      }

      const data: AiAvatarResponse =
        (await response.json()) as AiAvatarResponse;

      return data;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('AI Service est indisponible.');
    }
  }

  // Appel HTTP vers AI Services
  private async callAiService(
    dto: GenerateAvatarDto,
  ): Promise<AiAvatarResponse> {
    const url = `${this.aiServiceUrl}/api/v1/avatars/generate`;

    const payload = {
      user_id: dto.userId,
      measurements: {
        height_cm: dto.measurements.heightCm,
        weight_kg: dto.measurements.weightKg,
        chest_cm: dto.measurements.chestCm,
        waist_cm: dto.measurements.waistCm,
        hips_cm: dto.measurements.hipsCm,
        shoulder_width_cm: dto.measurements.shoulderWidthCm,
        inseam_cm: dto.measurements.inseamCm ?? null,
        neck_cm: dto.measurements.neckCm ?? null,
        arm_length_cm: dto.measurements.armLengthCm ?? null,
        thigh_cm: dto.measurements.thighCm ?? null,
        gender: dto.measurements.gender ?? 'neutral',
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ServiceUnavailableException(
          `AI Service a retourné une erreur : ${error}`,
        );
      }
      const data: AiAvatarResponse =
        (await response.json()) as AiAvatarResponse;

      return data;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'AI Service est indisponible. Vérifiez que le service est démarré.',
      );
    }
  }

  // Mapper document → DTO
  private toResponseDto(doc: AvatarDocument): AvatarResponseDto {
    const dto = new AvatarResponseDto();
    dto.avatarId = doc.avatarId;
    dto.userId = doc.userId;
    dto.smplParameters = {
      betas: doc.smplBetas,
      thetas: doc.smplThetas,
    };
    dto.mesh = {
      verticesCount: doc.verticesCount,
      facesCount: doc.facesCount,
      meshFormat: doc.meshFormat,
      meshReference: doc.meshReference,
    };
    dto.bmi = doc.bmi;
    dto.gender = doc.gender;
    dto.heightCm = doc.heightCm;
    dto.weightKg = doc.weightKg;
    dto.generationTimeMs = doc.generationTimeMs;
    dto.isActive = doc.isActive;
    dto.createdAt = doc.created_at;
    return dto;
  }
}
