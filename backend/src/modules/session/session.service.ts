import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  TryOnSession,
  SessionStatus,
  AnimationType,
} from './entities/try-on-session.entity';
import { AvatarSnapshot } from './entities/avatar-snapshot.entity';
import { Avatar, AvatarDocument } from '../avatar/schemas/avatar.schema';

import {
  CreateSessionDto,
  SessionResponseDto,
  SnapshotResponseDto,
} from './dto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(TryOnSession)
    private readonly sessionRepo: Repository<TryOnSession>,

    @InjectRepository(AvatarSnapshot)
    private readonly snapshotRepo: Repository<AvatarSnapshot>,

    @InjectModel(Avatar.name)
    private readonly avatarModel: Model<AvatarDocument>,
  ) {}

  // Sessions d'essayage

  async createSession(dto: CreateSessionDto): Promise<SessionResponseDto> {
    this.logger.log(
      `Création session — user=${dto.userId} clothing=${dto.clothingId}`,
    );

    const session = this.sessionRepo.create({
      userId: dto.userId,
      avatarId: dto.avatarId,
      clothingId: dto.clothingId,
      animationType: dto.animationType ?? AnimationType.STANDING,
      status: SessionStatus.INITIATED,
    });

    const saved = await this.sessionRepo.save(session);
    return this.toSessionDto(saved);
  }

  async completeSession(
    sessionId: string,
    result: {
      fitScore: number;
      overallFit: string;
      tensionZones: Record<string, unknown>[];
      simulationMs: number;
      simulationResult: Record<string, unknown>;
    },
  ): Promise<SessionResponseDto> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} introuvable`);
    }

    const updated = await this.sessionRepo.save({
      ...session,
      status: SessionStatus.COMPLETED,
      fitScore: result.fitScore,
      overallFit: result.overallFit,
      tensionZones: result.tensionZones,
      simulationMs: result.simulationMs,
      simulationResult: result.simulationResult,
      completedAt: new Date(),
    });

    this.logger.log(
      `Session ${sessionId} complétée — fitScore=${result.fitScore}`,
    );

    return this.toSessionDto(updated);
  }

  async failSession(sessionId: string, errorMessage: string): Promise<void> {
    await this.sessionRepo.update(sessionId, {
      status: SessionStatus.FAILED,
      errorMessage,
      completedAt: new Date(),
    });

    this.logger.warn(`Session ${sessionId} échouée — ${errorMessage}`);
  }

  async findSessionsByUser(
    userId: string,
    limit = 20,
  ): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return sessions.map((s) => this.toSessionDto(s));
  }

  async findSessionById(sessionId: string): Promise<SessionResponseDto> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} introuvable`);
    }

    return this.toSessionDto(session);
  }

  // Snapshots d'avatar

  async createSnapshotFromActiveAvatar(
    userId: string,
    label?: string,
  ): Promise<SnapshotResponseDto> {
    // Récupère l'avatar actif depuis MongoDB
    const avatar = await this.avatarModel.findOne({
      userId,
      isActive: true,
    });

    if (!avatar) {
      throw new NotFoundException(
        `Aucun avatar actif trouvé pour l'utilisateur ${userId}`,
      );
    }

    const snapshot = this.snapshotRepo.create({
      userId: userId,
      avatarId: avatar.avatarId,
      heightCm: avatar.heightCm,
      weightKg: avatar.weightKg,
      bmi: avatar.bmi,
      gender: avatar.gender,
      smplBetas: avatar.smplBetas,
      skinTone: avatar.skinTone ?? null,
      hairColor: avatar.hairColor ?? null,
      meshReference: avatar.meshReference,
      label: label ?? null,
    });

    const saved = await this.snapshotRepo.save(snapshot);
    this.logger.log(`Snapshot créé pour user=${userId} — id=${saved.id}`);
    return this.toSnapshotDto(saved);
  }

  async findSnapshotsByUser(userId: string): Promise<SnapshotResponseDto[]> {
    const snapshots = await this.snapshotRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return snapshots.map((s) => this.toSnapshotDto(s));
  }

  async restoreSnapshot(
    snapshotId: string,
    userId: string,
  ): Promise<SnapshotResponseDto> {
    const snapshot = await this.snapshotRepo.findOne({
      where: { id: snapshotId, userId },
    });

    if (!snapshot) {
      throw new NotFoundException(`Snapshot ${snapshotId} introuvable`);
    }

    // Désactive tous les avatars actifs
    await this.avatarModel.updateMany(
      { userId, isActive: true },
      { $set: { isActive: false } },
    );

    // Réactive l'avatar du snapshot
    await this.avatarModel.findOneAndUpdate(
      { avatarId: snapshot.avatarId },
      { $set: { isActive: true } },
    );

    this.logger.log(`Snapshot ${snapshotId} restauré pour user=${userId}`);

    return this.toSnapshotDto(snapshot);
  }

  // Nettoyage automatique

  async cleanupOldSessions(daysToKeep = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const result = await this.sessionRepo.delete({
      status: SessionStatus.COMPLETED,
      createdAt: LessThan(cutoff),
    });

    const count = result.affected ?? 0;
    this.logger.log(
      `Nettoyage sessions : ${count} sessions supprimées (>${daysToKeep}j)`,
    );
    return count;
  }

  async getUserStats(userId: string): Promise<Record<string, unknown>> {
    const [totalSessions, completedSessions, snapshots] = await Promise.all([
      this.sessionRepo.count({ where: { userId } }),
      this.sessionRepo.count({
        where: { userId, status: SessionStatus.COMPLETED },
      }),
      this.snapshotRepo.count({ where: { userId } }),
    ]);

    // Score moyen des essayages complétés
    const avgFitResult = await this.sessionRepo
      .createQueryBuilder('s')
      .select('AVG(s.fit_score)', 'avgFit')
      .where('s.user_id = :userId', { userId })
      .andWhere('s.status = :status', { status: SessionStatus.COMPLETED })
      .andWhere('s.fit_score IS NOT NULL')
      .getRawOne<{ avgFit: string }>();

    return {
      totalSessions,
      completedSessions,
      failedSessions: totalSessions - completedSessions,
      totalSnapshots: snapshots,
      averageFitScore: avgFitResult?.avgFit
        ? Math.round(parseFloat(avgFitResult.avgFit) * 100) / 100
        : null,
    };
  }

  // Mappers

  private toSessionDto(entity: TryOnSession): SessionResponseDto {
    const dto = new SessionResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.avatarId = entity.avatarId;
    dto.clothingId = entity.clothingId;
    dto.status = entity.status;
    dto.animationType = entity.animationType;
    dto.fitScore = entity.fitScore ? Number(entity.fitScore) : null;
    dto.overallFit = entity.overallFit;
    dto.tensionZones = entity.tensionZones;
    dto.simulationMs = entity.simulationMs;
    dto.createdAt = entity.createdAt;
    dto.completedAt = entity.completedAt;
    return dto;
  }

  private toSnapshotDto(entity: AvatarSnapshot): SnapshotResponseDto {
    const dto = new SnapshotResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.avatarId = entity.avatarId;
    dto.heightCm = Number(entity.heightCm);
    dto.weightKg = Number(entity.weightKg);
    dto.bmi = Number(entity.bmi);
    dto.gender = entity.gender;
    dto.skinTone = entity.skinTone;
    dto.hairColor = entity.hairColor;
    dto.meshReference = entity.meshReference;
    dto.label = entity.label;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
