import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';

import { VendorService } from '../vendor.service';
import {
  TryOnSession,
  SessionStatus,
  AnimationType,
} from '../../session/entities/try-on-session.entity';
import { Clothing } from '../../catalogue/schemas/clothing.schema';

// UUIDs de test
const VENDOR_ID = '523e4567-e89b-12d3-a456-426614174004';
const CLOTHING_ID = '423e4567-e89b-12d3-a456-426614174003';

// Mocks
const mockClothing = {
  clothingId: CLOTHING_ID,
  vendorId: VENDOR_ID,
  name: 'Chemise Test',
  category: 'top',
  fabricType: 'cotton',
  estimatedSize: 'M',
  isActive: true,
  isDigitized: true,
  elasticityCoeff: 0.25,
  frictionCoeff: 0.55,
  weightPerSqm: 150,
};

const mockSession: Partial<TryOnSession> = {
  id: 'session-vendor-001',
  userId: 'user-vendor-001',
  avatarId: 'avatar-vendor-001',
  clothingId: CLOTHING_ID,
  status: SessionStatus.COMPLETED,
  animationType: AnimationType.STANDING,
  fitScore: 85.0,
  overallFit: 'good',
  tensionZones: [
    { zone_name: 'chest', tension_level: 'medium', tension_value: 0.45 },
    { zone_name: 'waist', tension_level: 'low', tension_value: 0.18 },
  ],
  simulationMs: 342,
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-01'),
  completedAt: new Date('2026-06-01'),
};

const mockSessionRepo = {
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([mockSession]),
  })),
  count: jest.fn(),
  findOne: jest.fn(),
};

const mockClothingModel = {
  find: jest.fn(),
  findOne: jest.fn(),
};

describe('VendorService', () => {
  let service: VendorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorService,
        {
          provide: getRepositoryToken(TryOnSession),
          useValue: mockSessionRepo,
        },
        { provide: getModelToken(Clothing.name), useValue: mockClothingModel },
      ],
    }).compile();

    service = module.get<VendorService>(VendorService);
    jest.clearAllMocks();
  });

  // getDashboard
  describe('getDashboard', () => {
    it('lève NotFoundException si catalogue vide', async () => {
      mockClothingModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await expect(service.getDashboard(VENDOR_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retourne un dashboard avec les métriques', async () => {
      mockClothingModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockClothing]),
      });

      const result = await service.getDashboard(VENDOR_ID, 30);

      expect(result.catalogueStats.vendorId).toBe(VENDOR_ID);
      expect(result.catalogueStats.totalClothingItems).toBe(1);
      expect(Array.isArray(result.topPerformers)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.generatedAt).toBeDefined();
    });

    it('retourne les zones de tension dans les hotspots', async () => {
      mockClothingModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockClothing]),
      });

      const result = await service.getDashboard(VENDOR_ID);

      expect(Array.isArray(result.tensionHotspots)).toBe(true);
    });
  });

  // getClothingReport
  describe('getClothingReport', () => {
    it('lève NotFoundException si vêtement introuvable', async () => {
      mockClothingModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.getClothingReport(VENDOR_ID, CLOTHING_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('retourne un rapport détaillé', async () => {
      mockClothingModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClothing),
      });

      const result = await service.getClothingReport(VENDOR_ID, CLOTHING_ID);

      expect(result.performance.clothingId).toBe(CLOTHING_ID);
      expect(Array.isArray(result.improvementSuggestions)).toBe(true);
      expect(result.improvementSuggestions.length).toBeGreaterThan(0);
      expect(result.generatedAt).toBeDefined();
    });
  });

  // getSessionAnalytics
  describe('getSessionAnalytics', () => {
    it('retourne les analytics de sessions', async () => {
      mockClothingModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockClothing]),
      });

      const result = await service.getSessionAnalytics(VENDOR_ID, 30);

      expect(result.vendorId).toBe(VENDOR_ID);
      expect(result).toHaveProperty('totalSessions');
      expect(result).toHaveProperty('avgFitScore');
      expect(result).toHaveProperty('dailyMetrics');
    });
  });

  // Méthodes privées — _mostCommon
  describe('_mostCommon', () => {
    it("retourne l'élément le plus fréquent", () => {
      const privateService = service as unknown as {
        _mostCommon: (arr: string[]) => string | null;
      };
      const result = privateService._mostCommon([
        'good',
        'good',
        'tight',
        'good',
        'loose',
      ]);
      expect(result).toBe('good');
    });

    it('retourne null pour tableau vide', () => {
      const privateService = service as unknown as {
        _mostCommon: (arr: string[]) => string | null;
      };
      expect(privateService._mostCommon([])).toBeNull();
    });
  });

  // Recommandations
  describe('recommendations', () => {
    it('génère des recommandations pour catalogue avec problèmes', () => {
      const performances = [
        {
          clothingId: CLOTHING_ID,
          avgFitScore: 50, // < 65 → recommandation
          totalTryOns: 10,
          satisfactionRate: 40,
          tensionStats: [],
          name: 'Test',
          category: 'top',
          fabricType: 'cotton',
          estimatedSize: 'M',
          dominantFitCategory: 'tight',
          recommendedSizeAdjustment: 'L',
        },
      ];

      const privateService = service as unknown as {
        _generateVendorRecommendations: (
          performances: Record<string, unknown>[],
          hotspots: unknown[],
        ) => string[];
      };

      const recs = privateService._generateVendorRecommendations(
        performances,
        [],
      );

      expect(recs.length).toBeGreaterThan(0);
      expect(recs.some((r: string) => r.includes('score'))).toBe(true);
    });
  });
});
