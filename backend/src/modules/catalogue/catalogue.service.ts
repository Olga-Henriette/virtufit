import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Clothing, ClothingDocument } from './schemas/clothing.schema';
import { DigitizeClothingDto, ClothingResponseDto } from './dto';

type PhotoAnalysis = {
  view_angle: string;
  color_info: {
    dominant_rgb: number[];
    palette: number[][];
    is_patterned: boolean;
    pattern_type: string | null;
  };
  contour_info: {
    bounding_width_px: number;
    bounding_height_px: number;
    contour_area_px: number;
    aspect_ratio: number;
    symmetry_score: number;
  };
  quality_score: number;
};

type DigitizedClothingAIResponse = {
  clothing_id: string;
  vendor_id: string;
  category: string;
  fabric_type: string;
  photo_analyses: PhotoAnalysis[];
  mesh_reference: string;
  texture_reference: string;
  estimated_size: string;
  digitization_ms: number;
};

@Injectable()
export class CatalogueService {
  private readonly logger = new Logger(CatalogueService.name);
  private readonly aiServiceUrl: string;

  constructor(
    @InjectModel(Clothing.name)
    private readonly clothingModel: Model<ClothingDocument>,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  // Numériser un vêtement
  async digitize(
    dto: DigitizeClothingDto,
    files: Express.Multer.File[],
    angles: string[],
  ): Promise<ClothingResponseDto> {
    this.logger.log(
      `Numérisation — clothing=${dto.clothingId} photos=${files.length}`,
    );

    const aiResult: DigitizedClothingAIResponse = await this.callAiDigitize(
      dto,
      files,
      angles,
    );

    // Prend la première analyse (vue de face si disponible)
    const primaryAnalysis = aiResult.photo_analyses?.[0];

    const clothing = await this.clothingModel.findOneAndUpdate(
      { clothingId: dto.clothingId },
      {
        $set: {
          clothingId: dto.clothingId,
          vendorId: dto.vendorId,
          name: dto.name ?? `Vêtement ${dto.clothingId.slice(0, 8)}`,
          category: dto.category,
          fabricType: aiResult.fabric_type,
          estimatedSize: aiResult.estimated_size,
          colorInfo: primaryAnalysis
            ? {
                dominantRgb: primaryAnalysis.color_info.dominant_rgb,
                palette: primaryAnalysis.color_info.palette,
                isPatterned: primaryAnalysis.color_info.is_patterned,
                patternType: primaryAnalysis.color_info.pattern_type ?? null,
              }
            : null,
          contourInfo: primaryAnalysis
            ? {
                boundingWidthPx: primaryAnalysis.contour_info.bounding_width_px,
                boundingHeightPx:
                  primaryAnalysis.contour_info.bounding_height_px,
                contourAreaPx: primaryAnalysis.contour_info.contour_area_px,
                aspectRatio: primaryAnalysis.contour_info.aspect_ratio,
                symmetryScore: primaryAnalysis.contour_info.symmetry_score,
              }
            : null,
          meshReference: aiResult.mesh_reference,
          textureReference: aiResult.texture_reference,
          digitizationMs: aiResult.digitization_ms,
          isDigitized: true,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );

    this.logger.log(
      `Vêtement ${dto.clothingId} numérisé — fabric=${aiResult.fabric_type}`,
    );

    if (!clothing) {
      throw new NotFoundException(
        `Impossible de sauvegarder le vêtement ${dto.clothingId}`,
      );
    }

    return this.toResponseDto(clothing);
  }

  // Récupérer par ID
  async findById(clothingId: string): Promise<ClothingResponseDto> {
    const clothing = await this.clothingModel
      .findOne({ clothingId, isActive: true })
      .exec();

    if (!clothing) {
      throw new NotFoundException(`Vêtement ${clothingId} introuvable`);
    }
    return this.toResponseDto(clothing);
  }

  // Lister par vendeur
  async findByVendor(
    vendorId: string,
    category?: string,
  ): Promise<ClothingResponseDto[]> {
    const filter: Record<string, unknown> = { vendorId, isActive: true };
    if (category) filter['category'] = category;

    const items = await this.clothingModel
      .find(filter)
      .sort({ created_at: -1 })
      .exec();

    return items.map((c) => this.toResponseDto(c));
  }

  // Désactiver
  async deactivate(clothingId: string, vendorId: string): Promise<void> {
    const result = await this.clothingModel.findOneAndUpdate(
      { clothingId, vendorId },
      { $set: { isActive: false } },
    );

    if (!result) {
      throw new NotFoundException(`Vêtement ${clothingId} introuvable`);
    }
    this.logger.log(`Vêtement ${clothingId} désactivé`);
  }

  // Appel AI Services
  private async callAiDigitize(
    dto: DigitizeClothingDto,
    files: Express.Multer.File[],
    angles: string[],
  ): Promise<DigitizedClothingAIResponse> {
    const url = `${this.aiServiceUrl}/api/v1/clothing/digitize`;
    const formData = new FormData();

    formData.append('clothing_id', dto.clothingId);
    formData.append('vendor_id', dto.vendorId);
    formData.append('category', dto.category);
    formData.append('view_angles', JSON.stringify(angles));

    for (const file of files) {
      formData.append(
        'photos',
        new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }),
        file.originalname,
      );
    }

    try {
      const response = await fetch(url, { method: 'POST', body: formData });

      if (!response.ok) {
        const error = await response.text();
        throw new ServiceUnavailableException(
          `AI Service — digitize error: ${error}`,
        );
      }

      const data: unknown = await response.json();

      return data as DigitizedClothingAIResponse;
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new ServiceUnavailableException('AI Service est indisponible.');
    }
  }

  // Mapper
  private toResponseDto(doc: ClothingDocument): ClothingResponseDto {
    const dto = new ClothingResponseDto();
    dto.clothingId = doc.clothingId;
    dto.vendorId = doc.vendorId;
    dto.name = doc.name;
    dto.category = doc.category;
    dto.fabricType = doc.fabricType;
    dto.estimatedSize = doc.estimatedSize;
    dto.colorInfo = {
      dominantRgb: doc.colorInfo.dominantRgb,
      palette: doc.colorInfo.palette,
      isPatterned: doc.colorInfo.isPatterned,
      patternType: doc.colorInfo.patternType,
    };

    dto.contourInfo = {
      boundingWidthPx: doc.contourInfo.boundingWidthPx,
      boundingHeightPx: doc.contourInfo.boundingHeightPx,
      contourAreaPx: doc.contourInfo.contourAreaPx,
      aspectRatio: doc.contourInfo.aspectRatio,
      symmetryScore: doc.contourInfo.symmetryScore,
    };
    dto.elasticityCoeff = doc.elasticityCoeff;
    dto.frictionCoeff = doc.frictionCoeff;
    dto.meshReference = doc.meshReference;
    dto.textureReference = doc.textureReference;
    dto.isDigitized = doc.isDigitized;
    dto.digitizationMs = doc.digitizationMs;
    dto.createdAt = doc.created_at ?? new Date();
    return dto;
  }
}
