import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Measurement } from './entities/measurement.entity';
import {
  CreateMeasurementDto,
  UpdateMeasurementDto,
  MeasurementResponseDto,
} from './dto';

@Injectable()
export class MeasurementsService {
  private readonly logger = new Logger(MeasurementsService.name);

  constructor(
    @InjectRepository(Measurement)
    private readonly measurementRepository: Repository<Measurement>,
  ) {}

  // Créer
  async create(
    userId: string,
    dto: CreateMeasurementDto,
  ): Promise<MeasurementResponseDto> {
    this.logger.log(`Création mensurations pour l'utilisateur ${userId}`);

    const measurement = this.measurementRepository.create({
      userId,
      ...dto,
    });

    const saved = await this.measurementRepository.save(measurement);
    return this.toResponseDto(saved);
  }
  async findActiveByUserId(userId: string): Promise<MeasurementResponseDto> {
    const measurement = await this.measurementRepository.findOne({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    if (!measurement) {
      throw new NotFoundException(
        `Aucune mensuration active trouvée pour l'utilisateur ${userId}`,
      );
    }

    return this.toResponseDto(measurement);
  }

  // Lire (historique complet)
  async findAllByUserId(userId: string): Promise<MeasurementResponseDto[]> {
    const measurements = await this.measurementRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return measurements.map((m) => this.toResponseDto(m));
  }

  // Mettre à jour
  async update(
    id: string,
    userId: string,
    dto: UpdateMeasurementDto,
  ): Promise<MeasurementResponseDto> {
    const measurement = await this.measurementRepository.findOne({
      where: { id, userId, isActive: true },
    });

    if (!measurement) {
      throw new NotFoundException(`Mensuration ${id} introuvable`);
    }

    const updated = await this.measurementRepository.save({
      ...measurement,
      ...dto,
    });

    this.logger.log(`Mensuration ${id} mise à jour`);
    return this.toResponseDto(updated);
  }

  // Désactiver (soft delete)
  async deactivate(id: string, userId: string): Promise<void> {
    const measurement = await this.measurementRepository.findOne({
      where: { id, userId, isActive: true },
    });

    if (!measurement) {
      throw new NotFoundException(`Mensuration ${id} introuvable`);
    }

    await this.measurementRepository.save({
      ...measurement,
      isActive: false,
    });

    this.logger.log(`Mensuration ${id} désactivée`);
  }

  // Mapper entité → DTO
  private toResponseDto(entity: Measurement): MeasurementResponseDto {
    const dto = new MeasurementResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.heightCm = Number(entity.heightCm);
    dto.weightKg = Number(entity.weightKg);
    dto.chestCm = Number(entity.chestCm);
    dto.waistCm = Number(entity.waistCm);
    dto.hipsCm = Number(entity.hipsCm);
    dto.shoulderWidthCm = Number(entity.shoulderWidthCm);
    dto.inseamCm = entity.inseamCm ? Number(entity.inseamCm) : null;
    dto.neckCm = entity.neckCm ? Number(entity.neckCm) : null;
    dto.armLengthCm = entity.armLengthCm ? Number(entity.armLengthCm) : null;
    dto.thighCm = entity.thighCm ? Number(entity.thighCm) : null;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
