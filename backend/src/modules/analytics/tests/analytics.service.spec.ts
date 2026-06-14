import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';

import { AnalyticsService } from '../analytics.service';
import { TimePeriod } from '../dto';
import {
  TryOnSession,
  SessionStatus,
  AnimationType,
} from '../../session/entities/try-on-session.entity';
import { AvatarSnapshot } from '../../session/entities/avatar-snapshot.entity';
import { Clothing } from '../../catalogue/schemas/clothing.schema';

interface PrivateAnalyticsService {
  _bucketKey(date: Date, period: TimePeriod): string;
  _topN(items: string[], n: number): string[];
  _round(value: number): number;
}

// UUIDs de test
const USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const SESSION_ID = '223e4567-e89b-12d3-a456-426614174001';
const CLOTHING_ID = '423e4567-e89b-12d3-a456-426614174003';

// Mocks
const makeMockSession = (
  overrides: Partial<TryOnSession> = {},
): Partial<TryOnSession> => ({
  id: SESSION_ID,
  userId: USER_ID,
  clothingId: CLOTHING_ID,
  status: SessionStatus.COMPLETED,
  animationType: AnimationType.STANDING,
  fitScore: 85.0,
  overallFit: 'good',
  simulationMs: 342,
  tensionZones: [],
  simulationResult: { size_suggestion: 'M' },
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-01'),
  completedAt: new Date('2026-06-01'),
  ...overrides,
});

const mockClothing = {
  clothingId: CLOTHING_ID,
  category: 'top',
  fabricType: 'cotton',
  name: 'T-shirt test',
  isDigitized: true,
};

const mockSessionRepo = {
  find: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([makeMockSession()]),
  })),
};

const mockSnapshotRepo = { find: jest.fn() };

const mockClothingModel = {
  find: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue([mockClothing]),
  }),
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(TryOnSession),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(AvatarSnapshot),
          useValue: mockSnapshotRepo,
        },
        { provide: getModelToken(Clothing.name), useValue: mockClothingModel },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  // getUserFitProfile
  describe('getUserFitProfile', () => {
    it('retourne un profil vide si aucune session', async () => {
      mockSessionRepo.find.mockResolvedValue([]);
      const result = await service.getUserFitProfile(USER_ID);
      expect(result.userId).toBe(USER_ID);
      expect(result.totalTryOns).toBe(0);
      expect(result.avgFitScore).toBe(0);
    });

    it('calcule correctement le score moyen', async () => {
      mockSessionRepo.find.mockResolvedValue([
        makeMockSession({ fitScore: 80 }),
        makeMockSession({ fitScore: 90 }),
      ]);
      mockClothingModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockClothing]),
      });

      const result = await service.getUserFitProfile(USER_ID);
      expect(result.avgFitScore).toBe(85.0);
    });

    it('retourne les dates de premier et dernier essayage', async () => {
      const sessions = [
        makeMockSession({ createdAt: new Date('2026-01-01') }),
        makeMockSession({ createdAt: new Date('2026-06-01') }),
      ];
      mockSessionRepo.find.mockResolvedValue(sessions);
      mockClothingModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockClothing]),
      });

      const result = await service.getUserFitProfile(USER_ID);
      expect(result.firstTryOnDate).toContain('2026-01-01');
      expect(result.lastTryOnDate).toContain('2026-06-01');
    });

    it('calcule le taux de satisfaction correctement', async () => {
      mockSessionRepo.find.mockResolvedValue([
        makeMockSession({ fitScore: 80 }), // >= 70 → satisfait
        makeMockSession({ fitScore: 60 }), // < 70 → non satisfait
        makeMockSession({ fitScore: 90 }), // >= 70 → satisfait
        makeMockSession({ fitScore: 50 }), // < 70 → non satisfait
      ]);
      mockClothingModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockClothing]),
      });

      const result = await service.getUserFitProfile(USER_ID);
      expect(result.satisfactionRate).toBe(50.0);
    });
  });

  // getPlatformAnalytics
  describe('getPlatformAnalytics', () => {
    it('retourne un rapport de plateforme complet', async () => {
      const result = await service.getPlatformAnalytics(30, TimePeriod.DAILY);

      expect(result.overview).toBeDefined();
      expect(result.categoryBreakdown).toBeDefined();
      expect(result.fabricBreakdown).toBeDefined();
      expect(result.simulationPerformance).toBeDefined();
      expect(result.timeSeries).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    it('calcule le taux de complétion correctement', async () => {
      mockSessionRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            makeMockSession({ status: SessionStatus.COMPLETED }),
            makeMockSession({ status: SessionStatus.FAILED }),
            makeMockSession({ status: SessionStatus.COMPLETED }),
          ]),
      });

      const result = await service.getPlatformAnalytics();
      expect(result.overview.completionRate).toBeCloseTo(66.7, 0);
    });

    it('retourne les percentiles de simulation', async () => {
      mockSessionRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            makeMockSession({ simulationMs: 100 }),
            makeMockSession({ simulationMs: 200 }),
            makeMockSession({ simulationMs: 300 }),
            makeMockSession({ simulationMs: 400 }),
            makeMockSession({ simulationMs: 500 }),
          ]),
      });

      const result = await service.getPlatformAnalytics();
      const perf = result.simulationPerformance;

      expect(perf.minMs).toBeLessThanOrEqual(perf.p50Ms);
      expect(perf.p50Ms).toBeLessThanOrEqual(perf.p95Ms);
      expect(perf.p95Ms).toBeLessThanOrEqual(perf.maxMs);
    });
  });

  // exportSessions
  describe('exportSessions', () => {
    it('retourne les données exportées avec les bons champs', async () => {
      const result = await service.exportSessions({
        userId: USER_ID,
        limit: 10,
      });

      expect(result.totalRows).toBeGreaterThanOrEqual(0);
      expect(result.exportedAt).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);

      if (result.data.length > 0) {
        const row = result.data[0];
        expect(row).toHaveProperty('sessionId');
        expect(row).toHaveProperty('userId');
        expect(row).toHaveProperty('clothingId');
        expect(row).toHaveProperty('fitScore');
        expect(row).toHaveProperty('date');
      }
    });
  });

  // Utilitaires privés
  describe('_bucketKey', () => {
    it('retourne le bon format pour DAILY', () => {
      const privateService = service as unknown as PrivateAnalyticsService;
      const key = privateService._bucketKey(
        new Date('2026-06-03T15:30:00Z'),
        TimePeriod.DAILY,
      );
      expect(key).toBe('2026-06-03');
    });

    it('retourne le bon format pour MONTHLY', () => {
      const privateService = service as unknown as PrivateAnalyticsService;
      const key = privateService._bucketKey(
        new Date('2026-06-15'),
        TimePeriod.MONTHLY,
      );
      expect(key).toBe('2026-06');
    });

    it('retourne le lundi de la semaine pour WEEKLY', () => {
      const privateService = service as unknown as PrivateAnalyticsService;
      const key = privateService._bucketKey(
        new Date('2026-06-03'), // mercredi
        TimePeriod.WEEKLY,
      );
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('_topN', () => {
    it('retourne les N éléments les plus fréquents', () => {
      const privateService = service as unknown as PrivateAnalyticsService;
      const result = privateService._topN(
        ['cotton', 'cotton', 'denim', 'cotton', 'silk', 'denim'],
        2,
      );
      expect(result[0]).toBe('cotton');
      expect(result[1]).toBe('denim');
      expect(result).toHaveLength(2);
    });
  });

  describe('_round', () => {
    it('arrondit à 1 décimale par défaut', () => {
      const privateService = service as unknown as PrivateAnalyticsService;
      expect(privateService._round(84.25)).toBe(84.3);
      expect(privateService._round(84.24)).toBe(84.2);
    });
  });
});
