import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Avatar, AvatarDocument } from './schemas/avatar.schema';
import { PersonalizationResponseDto } from './dto';
import { PhotoAnalysisResult } from './interfaces/photo-analysis.interface';

@Injectable()
export class PersonalizationService {
  private readonly logger = new Logger(PersonalizationService.name);
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

  // Upload et analyse de photo
  async analyzeAndAttach(
    userId: string,
    file: Express.Multer.File,
  ): Promise<PersonalizationResponseDto> {
    this.logger.log(`Analyse photo — user=${userId}`);

    // Vérifie qu'un avatar actif existe
    const avatar = await this.avatarModel.findOne({
      userId,
      isActive: true,
    });

    if (!avatar) {
      throw new NotFoundException(
        `Aucun avatar actif trouvé pour l'utilisateur ${userId}. ` +
          `Générez d'abord un avatar.`,
      );
    }

    // Valide le type MIME
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        `Format non supporté : ${file.mimetype}. Formats acceptés : JPEG, PNG, WebP.`,
      );
    }

    // Appel vers AI Services
    const aiResult = await this.callAiAnalysis(userId, file);

    // Met à jour l'avatar avec les features visuelles
    const updated = await this.avatarModel.findOneAndUpdate(
      { _id: avatar._id },
      {
        $set: {
          photoReference: aiResult.photo_reference,
          skinTone: aiResult.visual_features.skin_tone,
          hairColor: aiResult.visual_features.hair_color,
          skinRgb: aiResult.visual_features.skin_rgb,
          hairRgb: aiResult.visual_features.hair_rgb,
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Avatar introuvable après mise à jour.');
    }

    this.logger.log(
      `Avatar ${avatar.avatarId} personnalisé — skin=${aiResult.visual_features.skin_tone}`,
    );

    return this.toResponseDto(
      updated,
      aiResult.visual_features.confidence_score,
    );
  }

  // Appel multipart → AI Services
  private async callAiAnalysis(
    userId: string,
    file: Express.Multer.File,
  ): Promise<PhotoAnalysisResult> {
    const url = `${this.aiServiceUrl}/api/v1/personalization/analyze-photo`;

    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append(
      'photo',
      new Blob(
        [
          file.buffer.buffer.slice(
            file.buffer.byteOffset,
            file.buffer.byteOffset + file.buffer.byteLength,
          ) as ArrayBuffer,
        ],
        {
          type: file.mimetype,
        },
      ),
      file.originalname,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new ServiceUnavailableException(
          `AI Service — analyse photo error: ${error}`,
        );
      }

      return (await response.json()) as PhotoAnalysisResult;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('AI Service est indisponible.');
    }
  }

  // Mapper document → DTO
  private toResponseDto(
    doc: AvatarDocument,
    confidenceScore: number,
  ): PersonalizationResponseDto {
    const dto = new PersonalizationResponseDto();
    dto.avatarId = doc.avatarId;
    dto.userId = doc.userId;
    dto.photoReference = doc.photoReference ?? '';
    dto.skinTone = doc.skinTone ?? '';
    dto.hairColor = doc.hairColor ?? '';
    dto.skinRgb = doc.skinRgb ?? [];
    dto.hairRgb = doc.hairRgb ?? [];
    dto.confidenceScore = confidenceScore;
    dto.updatedAt = doc.updated_at;
    return dto;
  }
}
