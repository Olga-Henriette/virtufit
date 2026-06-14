import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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

import {
  ClothingDetailReportDto,
  ClothingPerformanceDto,
  ClothingTensionStatsDto,
  SizeDistributionDto,
  TensionHotspotDto,
  VendorCatalogueStatsDto,
  VendorDashboardDto,
} from './dto';

interface TensionZoneStructure {
  zone_name?: string;
  zoneName?: string;
  tension_value?: number;
  tensionValue?: number;
  tension_level?: string;
  tensionLevel?: string;
}

interface SimulationResultStructure {
  size_suggestion?: string;
}

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

  constructor(
    @InjectRepository(TryOnSession)
    private readonly sessionRepo: Repository<TryOnSession>,

    @InjectModel(Clothing.name)
    private readonly clothingModel: Model<ClothingDocument>,
  ) {}

  // Dashboard principal

  async getDashboard(
    vendorId: string,
    periodDays: number = 30,
  ): Promise<VendorDashboardDto> {
    this.logger.log(`Dashboard — vendor=${vendorId} period=${periodDays}j`);

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Charge le catalogue du vendeur
    const catalogue = await this.clothingModel
      .find({ vendorId, isActive: true })
      .exec();

    if (!catalogue.length) {
      throw new NotFoundException(
        `Aucun article trouvé pour le vendeur ${vendorId}`,
      );
    }

    const clothingIds = catalogue.map((c) => c.clothingId);

    // Charge les sessions sur la période
    const sessions = await this._loadSessions(clothingIds, periodStart);

    // Calcule les métriques
    const performances = this._computePerformances(catalogue, sessions);
    const catalogueStats = this._computeCatalogueStats(
      vendorId,
      catalogue,
      sessions,
      periodStart,
    );
    const tensionHotspots = this._computeTensionHotspots(catalogue, sessions);
    const sizeDistrib = this._computeSizeDistribution(sessions);
    const recommendations = this._generateVendorRecommendations(
      performances,
      tensionHotspots,
    );

    const sorted = [...performances].sort(
      (a, b) => b.avgFitScore - a.avgFitScore,
    );
    const topPerformers = sorted.slice(0, 5);
    const needsAttention = sorted
      .filter((p) => p.avgFitScore < 65 || p.totalTryOns === 0)
      .slice(0, 5);

    return {
      catalogueStats,
      topPerformers,
      needsAttention,
      tensionHotspots,
      sizeDistribution: sizeDistrib,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  // Rapport par vêtement

  async getClothingReport(
    vendorId: string,
    clothingId: string,
  ): Promise<ClothingDetailReportDto> {
    this.logger.log(
      `Rapport vêtement — vendor=${vendorId} clothing=${clothingId}`,
    );

    const clothing = await this.clothingModel
      .findOne({
        clothingId,
        vendorId,
        isActive: true,
      })
      .exec();

    if (!clothing) {
      throw new NotFoundException(
        `Vêtement ${clothingId} introuvable pour le vendeur ${vendorId}`,
      );
    }

    const sessions = await this._loadSessions([clothingId]);
    const performances = this._computePerformances([clothing], sessions);
    const performance = performances[0] ?? this._emptyPerformance(clothing);

    const sizeDistrib = this._computeSizeDistribution(
      sessions.filter((s) => s.clothingId === clothingId),
    );

    const suggestions = this._generateClothingSuggestions(performance);

    return {
      performance,
      sizeDistribution: sizeDistrib,
      improvementSuggestions: suggestions,
      generatedAt: new Date().toISOString(),
    };
  }

  // Analytics des sessions par vendeur
  async getSessionAnalytics(
    vendorId: string,
    periodDays: number = 30,
  ): Promise<Record<string, unknown>> {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const catalogue = await this.clothingModel
      .find({ vendorId, isActive: true })
      .exec();
    const clothingIds = catalogue.map((c) => c.clothingId);
    const sessions = await this._loadSessions(clothingIds, periodStart);

    const completed = sessions.filter(
      (s) => s.status === SessionStatus.COMPLETED,
    );

    // Score moyen par jour
    const byDay: Record<string, number[]> = {};
    for (const s of completed) {
      const day = s.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = [];
      if (s.fitScore) byDay[day].push(Number(s.fitScore));
    }

    const dailyAvg = Object.entries(byDay)
      .map(([date, scores]) => ({
        date,
        avgFitScore: scores.length
          ? Math.round(
              (scores.reduce((a, b) => a + b, 0) / scores.length) * 10,
            ) / 10
          : 0,
        sessionCount: scores.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      vendorId,
      periodDays,
      totalSessions: sessions.length,
      completedSessions: completed.length,
      failedSessions: sessions.length - completed.length,
      avgFitScore: completed.length
        ? Math.round(
            (completed.reduce((a, s) => a + Number(s.fitScore ?? 0), 0) /
              completed.length) *
              10,
          ) / 10
        : 0,
      dailyMetrics: dailyAvg,
    };
  }

  // Méthodes privées — chargement

  private async _loadSessions(
    clothingIds: string[],
    since?: Date,
  ): Promise<TryOnSession[]> {
    if (!clothingIds.length) return [];

    const qb = this.sessionRepo
      .createQueryBuilder('s')
      .where('s.clothing_id IN (:...ids)', { ids: clothingIds });

    if (since) {
      qb.andWhere('s.created_at >= :since', { since });
    }

    return qb.orderBy('s.created_at', 'DESC').getMany();
  }

  // Méthodes privées — calculs

  private _computePerformances(
    catalogue: ClothingDocument[],
    sessions: TryOnSession[],
  ): ClothingPerformanceDto[] {
    return catalogue.map((clothing) => {
      const clothingSessions = sessions.filter(
        (s) => s.clothingId === clothing.clothingId,
      );
      const completed = clothingSessions.filter(
        (s) => s.status === SessionStatus.COMPLETED,
      );

      const scores = completed
        .map((s) => Number(s.fitScore ?? 0))
        .filter((v) => v > 0);

      const avgFitScore = scores.length
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
          10
        : 0;

      const tensionStats = this._computeTensionStats(completed);
      const fitCategories = completed
        .map((s) => s.overallFit)
        .filter(Boolean) as string[];

      const dominantFit = this._mostCommon(fitCategories) ?? 'unknown';

      const satisfactionRate = completed.length
        ? Math.round(
            (completed.filter((s) => (s.fitScore ?? 0) >= 70).length /
              completed.length) *
              1000,
          ) / 10
        : 0;

      const recommendedSize = this._recommendSizeAdjustment(tensionStats);

      return {
        clothingId: clothing.clothingId,
        name: clothing.name,
        category: clothing.category,
        fabricType: clothing.fabricType,
        estimatedSize: clothing.estimatedSize,
        totalTryOns: clothingSessions.length,
        avgFitScore,
        dominantFitCategory: dominantFit,
        satisfactionRate,
        tensionStats,
        recommendedSizeAdjustment: recommendedSize,
      };
    });
  }

  private _computeTensionStats(
    sessions: TryOnSession[],
  ): ClothingTensionStatsDto[] {
    const zoneData: Record<string, { values: number[]; levels: string[] }> = {};

    for (const session of sessions) {
      const zones =
        (session.tensionZones as unknown as TensionZoneStructure[]) ?? [];
      for (const z of zones) {
        const name = z.zone_name ?? z.zoneName;
        if (!name) continue;
        if (!zoneData[name]) zoneData[name] = { values: [], levels: [] };
        zoneData[name].values.push(
          Number(z.tension_value ?? z.tensionValue ?? 0),
        );
        zoneData[name].levels.push(z.tension_level ?? z.tensionLevel ?? 'low');
      }
    }

    return Object.entries(zoneData).map(([zoneName, targetdata]) => {
      const avgVal = targetdata.values.length
        ? Math.round(
            (targetdata.values.reduce((a, b) => a + b, 0) /
              targetdata.values.length) *
              1000,
          ) / 1000
        : 0;

      const dominantLevel = this._mostCommon(targetdata.levels) ?? 'low';
      const pct = sessions.length
        ? Math.round((targetdata.values.length / sessions.length) * 1000) / 10
        : 0;

      return {
        zoneName,
        avgTensionValue: avgVal,
        dominantLevel,
        occurrenceCount: targetdata.values.length,
        percentageOfSessions: pct,
      };
    });
  }

  private _computeCatalogueStats(
    vendorId: string,
    catalogue: ClothingDocument[],
    sessions: TryOnSession[],
    periodStart: Date,
  ): VendorCatalogueStatsDto {
    const completed = sessions.filter(
      (s) => s.status === SessionStatus.COMPLETED,
    );

    const scores = completed
      .map((s) => Number(s.fitScore ?? 0))
      .filter((v) => v > 0);

    const avgFit = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
        10
      : 0;

    const satisf = completed.length
      ? Math.round(
          (completed.filter((s) => (s.fitScore ?? 0) >= 70).length /
            completed.length) *
            1000,
        ) / 10
      : 0;

    return {
      vendorId,
      totalClothingItems: catalogue.length,
      digitizedItems: catalogue.filter((c) => c.isDigitized).length,
      totalTryOns: sessions.length,
      avgFitScoreAcrossCatalogue: avgFit,
      overallSatisfactionRate: satisf,
      periodStart: periodStart.toISOString(),
      periodEnd: new Date().toISOString(),
    };
  }

  private _computeTensionHotspots(
    catalogue: ClothingDocument[],
    sessions: TryOnSession[],
  ): TensionHotspotDto[] {
    const zoneItems: Record<string, Set<string>> = {};
    const zoneLevels: Record<string, string[]> = {};

    for (const session of sessions) {
      const zones =
        (session.tensionZones as unknown as TensionZoneStructure[]) ?? [];
      for (const z of zones) {
        const name = z.zone_name ?? z.zoneName;
        const level = z.tension_level ?? z.tensionLevel ?? 'low';
        if (!name || level === 'none' || level === 'low') continue;

        if (!zoneItems[name]) zoneItems[name] = new Set();
        if (!zoneLevels[name]) zoneLevels[name] = [];

        zoneItems[name].add(session.clothingId);
        zoneLevels[name].push(level);
      }
    }

    return Object.entries(zoneItems)
      .map(([zoneName, itemSet]) => {
        const levels = zoneLevels[zoneName] ?? [];
        const severityLevel = this._mostCommon(levels) ?? 'medium';
        const affectedItems = itemSet.size;
        const pct = catalogue.length
          ? Math.round((affectedItems / catalogue.length) * 1000) / 10
          : 0;

        const topItems = [...itemSet].slice(0, 3).map((id) => {
          const c = catalogue.find((x) => x.clothingId === id);
          return c?.name ?? id;
        });

        return {
          zoneName,
          affectedItems,
          percentageAffected: pct,
          severityLevel,
          topAffectedItems: topItems,
        };
      })
      .sort((a, b) => b.percentageAffected - a.percentageAffected);
  }

  private _computeSizeDistribution(
    sessions: TryOnSession[],
  ): SizeDistributionDto[] {
    const sizeMap: Record<string, { count: number; scores: number[] }> = {};

    for (const s of sessions) {
      if (s.status !== SessionStatus.COMPLETED) continue;

      // Récupère la taille depuis simulationResult
      const simResult =
        s.simulationResult as unknown as SimulationResultStructure;
      const size = simResult?.size_suggestion ?? 'M';

      if (!sizeMap[size]) sizeMap[size] = { count: 0, scores: [] };
      sizeMap[size].count++;
      if (s.fitScore) sizeMap[size].scores.push(Number(s.fitScore));
    }

    const total = Object.values(sizeMap).reduce((a, v) => a + v.count, 0);

    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

    return sizeOrder
      .filter((size) => sizeMap[size])
      .map((size) => {
        const data = sizeMap[size];
        const avgScore = data.scores.length
          ? Math.round(
              (data.scores.reduce((a, b) => a + b, 0) / data.scores.length) *
                10,
            ) / 10
          : 0;

        return {
          size,
          tryOnCount: data.count,
          percentage: total ? Math.round((data.count / total) * 1000) / 10 : 0,
          avgFitScore: avgScore,
        };
      });
  }

  // Recommandations

  private _generateVendorRecommendations(
    performances: ClothingPerformanceDto[],
    hotspots: TensionHotspotDto[],
  ): string[] {
    const recs: string[] = [];

    const lowPerformers = performances.filter((p) => p.avgFitScore < 65);
    if (lowPerformers.length > 0) {
      recs.push(
        `${lowPerformers.length} article(s) ont un score d'ajustement inférieur à 65. ` +
          `Envisagez de réviser leur patronage.`,
      );
    }

    const hotChest = hotspots.find((h) => h.zoneName === 'chest');
    if (hotChest && hotChest.percentageAffected > 40) {
      recs.push(
        `La zone poitrine est tendue sur ${hotChest.percentageAffected}% de vos articles. ` +
          `Augmentez l'aisance poitrine de 2-3 cm sur vos patrons.`,
      );
    }

    const noTryOns = performances.filter((p) => p.totalTryOns === 0);
    if (noTryOns.length > 0) {
      recs.push(
        `${noTryOns.length} article(s) n'ont reçu aucun essayage. ` +
          `Vérifiez leur visibilité dans le catalogue.`,
      );
    }

    const highSat = performances.filter((p) => p.satisfactionRate >= 90);
    if (highSat.length > 0) {
      recs.push(
        `${highSat.length} article(s) ont un taux de satisfaction ≥ 90%. ` +
          `Utilisez leurs patrons comme référence pour vos nouvelles collections.`,
      );
    }

    if (!recs.length) {
      recs.push(
        'Votre catalogue présente de bonnes performances globales. Continuez ainsi !',
      );
    }

    return recs;
  }

  private _generateClothingSuggestions(perf: ClothingPerformanceDto): string[] {
    const suggestions: string[] = [];

    if (perf.avgFitScore < 55) {
      suggestions.push(
        "Le score d'ajustement est insuffisant — une révision complète du patron est recommandée.",
      );
    } else if (perf.avgFitScore < 70) {
      suggestions.push(
        "Le score d'ajustement est correct mais améliorable — ajustez les zones en tension.",
      );
    } else {
      suggestions.push(
        'Le patron est bien adapté à la majorité des morphologies.',
      );
    }

    for (const zone of perf.tensionStats) {
      if (zone.dominantLevel === 'high' || zone.dominantLevel === 'critical') {
        const zoneRecs: Record<string, string> = {
          chest: `Augmentez l'aisance poitrine de 2-4 cm.`,
          waist: `Augmentez l'aisance taille de 2-3 cm.`,
          hips: `Augmentez l'aisance hanches de 3-5 cm.`,
          shoulders: `Élargissez les épaules de 1-2 cm.`,
          back: `Ajoutez une pince dos ou augmentez le milieu dos.`,
          arms: `Agrandissez l'emmanchure de 1 cm.`,
          neck: `Agrandissez l'encolure de 0.5-1 cm.`,
        };
        const rec = zoneRecs[zone.zoneName];
        if (rec) suggestions.push(rec);
      }
    }

    if (perf.recommendedSizeAdjustment) {
      suggestions.push(
        `La taille étiquetée ${perf.estimatedSize} correspond davantage à une taille ` +
          `${perf.recommendedSizeAdjustment} selon les données d'essayage.`,
      );
    }

    return suggestions;
  }

  // Utilitaires

  private _mostCommon<T>(arr: T[]): T | null {
    if (!arr.length) return null;
    const freq = new Map<T, number>();
    for (const item of arr) freq.set(item, (freq.get(item) ?? 0) + 1);
    return [...freq.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  }

  private _recommendSizeAdjustment(
    tensionStats: ClothingTensionStatsDto[],
  ): string | null {
    const highZones = tensionStats.filter(
      (z) => z.dominantLevel === 'high' || z.dominantLevel === 'critical',
    );
    if (highZones.length >= 2) return 'L';
    if (highZones.length === 1) return 'M/L';
    return null;
  }

  private _emptyPerformance(
    clothing: ClothingDocument,
  ): ClothingPerformanceDto {
    return {
      clothingId: clothing.clothingId,
      name: clothing.name,
      category: clothing.category,
      fabricType: clothing.fabricType,
      estimatedSize: clothing.estimatedSize,
      totalTryOns: 0,
      avgFitScore: 0,
      dominantFitCategory: 'unknown',
      satisfactionRate: 0,
      tensionStats: [],
      recommendedSizeAdjustment: null,
    };
  }
}
