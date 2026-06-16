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

const makeSession = (overrides = {}): Partial<TryOnSession> => ({
  id: 'edge-session',
  userId: 'edge-user',
  clothingId: 'edge-cloth',
  status: SessionStatus.COMPLETED,
  animationType: AnimationType.STANDING,
  fitScore: 85.0,
  overallFit: 'good',
  simulationMs: 300,
  tensionZones: [],
  simulationResult: null, // ← edge case : null
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-01'),
  completedAt: new Date('2026-06-01'),
  ...overrides,
});

const mockClothingModel = {
  find: jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue([]),
  }),
};

describe('AnalyticsService — Edge Cases', () => {
  let service: AnalyticsService;

  const mockSessionRepo = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

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
          useValue: { find: jest.fn() },
        },
        { provide: getModelToken(Clothing.name), useValue: mockClothingModel },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  // Sessions avec simulationResult null
  it('gère simulationResult null dans sizeDistribution', async () => {
    mockSessionRepo.find.mockResolvedValue([
      makeSession({ simulationResult: null }),
      makeSession({ simulationResult: undefined }),
    ]);
    mockClothingModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });

    const result = await service.getUserFitProfile('edge-user');
    expect(result.totalTryOns).toBe(2);
  });

  // Sessions avec fitScore null
  it('calcule avgFitScore à 0 quand tous les scores sont nuls', async () => {
    mockSessionRepo.find.mockResolvedValue([
      makeSession({ fitScore: null }),
      makeSession({ fitScore: null }),
    ]);
    mockClothingModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });

    const result = await service.getUserFitProfile('edge-user');
    expect(result.avgFitScore).toBe(0);
  });

  // Liste vide de sessions
  it('retourne un profil vide pour utilisateur sans essayage', async () => {
    mockSessionRepo.find.mockResolvedValue([]);

    const result = await service.getUserFitProfile('new-user');
    expect(result.totalTryOns).toBe(0);
    expect(result.fitScoreTrend).toHaveLength(0);
    expect(result.firstTryOnDate).toBe('');
    expect(result.lastTryOnDate).toBe('');
  });

  // Platform analytics sans sessions
  it('retourne des analytics vides sans sessions', async () => {
    mockSessionRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    });

    const result = await service.getPlatformAnalytics();
    expect(result.overview.totalTryOns).toBe(0);
    expect(result.overview.avgFitScore).toBe(0);
    expect(result.overview.completionRate).toBe(0);
    expect(result.categoryBreakdown).toHaveLength(0);
    expect(result.timeSeries).toHaveLength(0);
  });

  // _bucketKey edge cases
  it('_bucketKey gère les dates de début de semaine', () => {
    // Lundi
    const monday = new Date('2026-06-01'); // lundi
    const key = service['_bucketKey'](monday, TimePeriod.WEEKLY);
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // _topN avec liste vide
  it('_topN retourne [] pour liste vide', () => {
    const result = service['_topN']([], 3);
    expect(result).toEqual([]);
  });

  // _round edge cases
  it('_round gère 0 correctement', () => {
    expect(service['_round'](0)).toBe(0);
  });

  it('_round gère les nombres très petits', () => {
    expect(service['_round'](0.001)).toBe(0.0);
  });
});
