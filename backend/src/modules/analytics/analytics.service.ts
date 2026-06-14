import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectModel } from '@nestjs/mongoose';
import { Repository } from 'typeorm';
import { Model } from 'mongoose';

import {
  TryOnSession,
  SessionStatus,
} from '../session/entities/try-on-session.entity';
import {
  Clothing,
  ClothingDocument,
} from '../catalogue/schemas/clothing.schema';
import { AvatarSnapshot } from '../session/entities/avatar-snapshot.entity';

import {
  CategoryBreakdownDto,
  ExportResponseDto,
  ExportRowDto,
  FabricBreakdownDto,
  PlatformAnalyticsDto,
  PlatformOverviewDto,
  SimulationPerformanceDto,
  TimePeriod,
  TimeSeriesPointDto,
  UserFitProfileDto,
} from './dto';

interface SimulationResultData {
  size_suggestion?: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(TryOnSession)
    private readonly sessionRepo: Repository<TryOnSession>,

    @InjectRepository(AvatarSnapshot)
    private readonly snapshotRepo: Repository<AvatarSnapshot>,

    @InjectModel(Clothing.name)
    private readonly clothingModel: Model<ClothingDocument>,
  ) {}

  // Analytics utilisateur

  async getUserFitProfile(userId: string): Promise<UserFitProfileDto> {
    this.logger.log(`Profil utilisateur — user=${userId}`);

    const sessions = await this.sessionRepo.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    const completed = sessions.filter(
      (s) => s.status === SessionStatus.COMPLETED,
    );

    if (!sessions.length) {
      return this._emptyUserProfile(userId);
    }

    // Scores
    const scores = completed
      .map((s) => Number(s.fitScore ?? 0))
      .filter((v) => v > 0);

    const avgFitScore = scores.length
      ? this._round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Catégories préférées
    const clothingIds = [...new Set(sessions.map((s) => s.clothingId))];
    const clothingDocs = await this._loadClothingMap(clothingIds);

    const categories = sessions
      .map((s) => clothingDocs.get(s.clothingId)?.category)
      .filter(Boolean) as string[];
    const fabrics = sessions
      .map((s) => clothingDocs.get(s.clothingId)?.fabricType)
      .filter(Boolean) as string[];

    // Taille la plus commune
    const sizes = completed
      .map(
        (s) =>
          (s.simulationResult as unknown as SimulationResultData)
            ?.size_suggestion,
      )
      .filter(Boolean) as string[];

    // Trend du score
    const fitScoreTrend = this._buildUserTimeSeries(completed);

    // Taux de satisfaction
    const satisfactionRate = completed.length
      ? this._round(
          (completed.filter((s) => (s.fitScore ?? 0) >= 70).length /
            completed.length) *
            100,
        )
      : 0;

    return {
      userId,
      totalTryOns: sessions.length,
      avgFitScore,
      preferredFitCategory:
        this._mostCommon(
          completed.map((s) => s.overallFit).filter(Boolean) as string[],
        ) ?? 'unknown',
      preferredCategories: this._topN(categories, 3),
      preferredFabrics: this._topN(fabrics, 3),
      mostCommonSize: this._mostCommon(sizes) ?? 'M',
      satisfactionRate,
      fitScoreTrend,
      firstTryOnDate: sessions[0].createdAt.toISOString(),
      lastTryOnDate: sessions[sessions.length - 1].createdAt.toISOString(),
    };
  }

  // Analytics plateforme

  async getPlatformAnalytics(
    periodDays: number = 30,
    period: TimePeriod = TimePeriod.DAILY,
  ): Promise<PlatformAnalyticsDto> {
    this.logger.log(
      `Analytics plateforme — period=${periodDays}j granularity=${period}`,
    );

    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const sessions = await this.sessionRepo
      .createQueryBuilder('s')
      .where('s.created_at >= :since', { since })
      .orderBy('s.created_at', 'ASC')
      .getMany();

    const clothingIds = [...new Set(sessions.map((s) => s.clothingId))];
    const clothingDocs = await this._loadClothingMap(clothingIds);

    const overview = this._computePlatformOverview(sessions, clothingIds);
    const categoryBD = this._computeCategoryBreakdown(sessions, clothingDocs);
    const fabricBD = this._computeFabricBreakdown(sessions, clothingDocs);
    const simPerf = this._computeSimulationPerformance(sessions);
    const timeSeries = this._buildPlatformTimeSeries(sessions, period);

    return {
      overview,
      categoryBreakdown: categoryBD,
      fabricBreakdown: fabricBD,
      simulationPerformance: simPerf,
      timeSeries,
      generatedAt: new Date().toISOString(),
    };
  }

  // Export de données

  async exportSessions(filters: {
    userId?: string;
    vendorId?: string;
    since?: Date;
    until?: Date;
    limit?: number;
  }): Promise<ExportResponseDto> {
    this.logger.log('Export sessions — filtres=%o', filters);

    const qb = this.sessionRepo
      .createQueryBuilder('s')
      .orderBy('s.created_at', 'DESC')
      .take(filters.limit ?? 1000);

    if (filters.userId) {
      qb.andWhere('s.user_id = :userId', { userId: filters.userId });
    }
    if (filters.since) {
      qb.andWhere('s.created_at >= :since', { since: filters.since });
    }
    if (filters.until) {
      qb.andWhere('s.created_at <= :until', { until: filters.until });
    }

    const sessions = await qb.getMany();
    const clothingIds = [...new Set(sessions.map((s) => s.clothingId))];
    const clothingDocs = await this._loadClothingMap(clothingIds);

    const rows: ExportRowDto[] = sessions.map((s) => {
      const clothing = clothingDocs.get(s.clothingId);
      return {
        date: s.createdAt.toISOString().split('T')[0],
        sessionId: s.id,
        userId: s.userId,
        clothingId: s.clothingId,
        category: clothing?.category ?? 'unknown',
        fabricType: clothing?.fabricType ?? 'unknown',
        animationType: s.animationType,
        status: s.status,
        fitScore: s.fitScore ? Number(s.fitScore) : 0,
        overallFit: s.overallFit ?? 'unknown',
        simulationMs: s.simulationMs ?? 0,
      };
    });

    return {
      totalRows: rows.length,
      exportedAt: new Date().toISOString(),
      data: rows,
    };
  }

  // Méthodes privées — calculs

  private _computePlatformOverview(
    sessions: TryOnSession[],
    clothingIds: string[],
  ): PlatformOverviewDto {
    const completed = sessions.filter(
      (s) => s.status === SessionStatus.COMPLETED,
    );

    const scores = completed
      .map((s) => Number(s.fitScore ?? 0))
      .filter((v) => v > 0);

    const simMs = completed
      .map((s) => s.simulationMs ?? 0)
      .filter((v) => v > 0);

    const uniqueUsers = new Set(sessions.map((s) => s.userId)).size;

    return {
      totalTryOns: sessions.length,
      completedTryOns: completed.length,
      avgFitScore: scores.length
        ? this._round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
      completionRate: sessions.length
        ? this._round((completed.length / sessions.length) * 100)
        : 0,
      avgSimulationMs: simMs.length
        ? this._round(simMs.reduce((a, b) => a + b, 0) / simMs.length)
        : 0,
      uniqueUsers,
      uniqueClothingItems: clothingIds.length,
    };
  }

  private _computeCategoryBreakdown(
    sessions: TryOnSession[],
    clothingMap: Map<string, ClothingDocument>,
  ): CategoryBreakdownDto[] {
    const categoryData: Record<
      string,
      { count: number; scores: number[]; satisfied: number }
    > = {};

    for (const s of sessions) {
      const clothing = clothingMap.get(s.clothingId);
      const cat = clothing?.category ?? 'unknown';

      if (!categoryData[cat]) {
        categoryData[cat] = { count: 0, scores: [], satisfied: 0 };
      }

      categoryData[cat].count++;
      if (s.fitScore) {
        const score = Number(s.fitScore);
        categoryData[cat].scores.push(score);
        if (score >= 70) categoryData[cat].satisfied++;
      }
    }

    const total = sessions.length || 1;

    return Object.entries(categoryData)
      .map(([category, data]) => ({
        category,
        tryOnCount: data.count,
        percentage: this._round((data.count / total) * 100),
        avgFitScore: data.scores.length
          ? this._round(
              data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
            )
          : 0,
        satisfactionRate: data.scores.length
          ? this._round((data.satisfied / data.scores.length) * 100)
          : 0,
      }))
      .sort((a, b) => b.tryOnCount - a.tryOnCount);
  }

  private _computeFabricBreakdown(
    sessions: TryOnSession[],
    clothingMap: Map<string, ClothingDocument>,
  ): FabricBreakdownDto[] {
    const fabricData: Record<string, { count: number; scores: number[] }> = {};

    for (const s of sessions) {
      const clothing = clothingMap.get(s.clothingId);
      const fabric = clothing?.fabricType ?? 'unknown';

      if (!fabricData[fabric]) fabricData[fabric] = { count: 0, scores: [] };
      fabricData[fabric].count++;
      if (s.fitScore) fabricData[fabric].scores.push(Number(s.fitScore));
    }

    const total = sessions.length || 1;

    return Object.entries(fabricData)
      .map(([fabricType, data]) => ({
        fabricType,
        tryOnCount: data.count,
        percentage: this._round((data.count / total) * 100),
        avgFitScore: data.scores.length
          ? this._round(
              data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
            )
          : 0,
      }))
      .sort((a, b) => b.tryOnCount - a.tryOnCount);
  }

  private _computeSimulationPerformance(
    sessions: TryOnSession[],
  ): SimulationPerformanceDto {
    const completed = sessions.filter(
      (s) => s.status === SessionStatus.COMPLETED,
    );

    const durations = completed
      .map((s) => s.simulationMs ?? 0)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    if (!durations.length) {
      return {
        avgMs: 0,
        p50Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
        minMs: 0,
        maxMs: 0,
        successRate: 0,
      };
    }

    const percentile = (p: number): number => {
      const idx = Math.floor((durations.length * p) / 100);
      return durations[Math.min(idx, durations.length - 1)];
    };

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

    const successRate = sessions.length
      ? this._round((completed.length / sessions.length) * 100)
      : 0;

    return {
      avgMs: this._round(avg),
      p50Ms: percentile(50),
      p95Ms: percentile(95),
      p99Ms: percentile(99),
      minMs: durations[0],
      maxMs: durations[durations.length - 1],
      successRate,
    };
  }

  private _buildPlatformTimeSeries(
    sessions: TryOnSession[],
    period: TimePeriod,
  ): TimeSeriesPointDto[] {
    const buckets: Record<
      string,
      { count: number; scores: number[]; completed: number; failed: number }
    > = {};

    for (const s of sessions) {
      const key = this._bucketKey(s.createdAt, period);
      if (!buckets[key]) {
        buckets[key] = { count: 0, scores: [], completed: 0, failed: 0 };
      }

      buckets[key].count++;
      if (s.status === SessionStatus.COMPLETED) {
        buckets[key].completed++;
        if (s.fitScore) buckets[key].scores.push(Number(s.fitScore));
      } else {
        buckets[key].failed++;
      }
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        count: data.count,
        avgFitScore: data.scores.length
          ? this._round(
              data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
            )
          : 0,
        completedCount: data.completed,
        failedCount: data.failed,
      }));
  }

  private _buildUserTimeSeries(sessions: TryOnSession[]): TimeSeriesPointDto[] {
    const buckets: Record<string, number[]> = {};

    for (const s of sessions) {
      const key = s.createdAt.toISOString().split('T')[0];
      if (!buckets[key]) buckets[key] = [];
      if (s.fitScore) buckets[key].push(Number(s.fitScore));
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, scores]) => ({
        date,
        count: scores.length,
        avgFitScore: scores.length
          ? this._round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0,
      }));
  }

  // Utilitaires

  private async _loadClothingMap(
    clothingIds: string[],
  ): Promise<Map<string, ClothingDocument>> {
    if (!clothingIds.length) return new Map();

    const docs = await this.clothingModel
      .find({ clothingId: { $in: clothingIds } })
      .exec();

    return new Map(docs.map((d) => [d.clothingId, d]));
  }

  private _bucketKey(date: Date, period: TimePeriod): string {
    const d = new Date(date);
    if (period === TimePeriod.DAILY) {
      return d.toISOString().split('T')[0];
    }
    if (period === TimePeriod.WEEKLY) {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return monday.toISOString().split('T')[0];
    }
    // MONTHLY
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  private _mostCommon<T>(arr: T[]): T | null {
    if (!arr.length) return null;
    const freq = new Map<T, number>();
    for (const item of arr) freq.set(item, (freq.get(item) ?? 0) + 1);
    return [...freq.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }

  private _topN<T>(arr: T[], n: number): T[] {
    const freq = new Map<T, number>();
    for (const item of arr) freq.set(item, (freq.get(item) ?? 0) + 1);
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([item]) => item);
  }

  private _round(val: number, decimals = 1): number {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  }

  private _emptyUserProfile(userId: string): UserFitProfileDto {
    return {
      userId,
      totalTryOns: 0,
      avgFitScore: 0,
      preferredFitCategory: 'unknown',
      preferredCategories: [],
      preferredFabrics: [],
      mostCommonSize: 'M',
      satisfactionRate: 0,
      fitScoreTrend: [],
      firstTryOnDate: '',
      lastTryOnDate: '',
    };
  }
}
