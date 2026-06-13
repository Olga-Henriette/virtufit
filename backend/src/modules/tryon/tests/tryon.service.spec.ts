import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

import { TryOnService } from '../tryon.service';
import {
  TryOnSession,
  SessionStatus,
  AnimationType,
} from '../../session/entities/try-on-session.entity';
import { Avatar } from '../../avatar/schemas/avatar.schema';
import { Clothing } from '../../catalogue/schemas/clothing.schema';
import { StartTryOnDto, TryOnAnimationType } from '../dto';

// UUIDs de test
const USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const AVATAR_ID = 'avatar-tryon-test-001';
const CLOTHING_ID = '423e4567-e89b-12d3-a456-426614174003';
const SESSION_ID = '523e4567-e89b-12d3-a456-426614174004';

// Mocks
const mockAvatar = {
  userId: USER_ID,
  avatarId: AVATAR_ID,
  smplBetas: [0.0, 0.5, -0.3, 0.1, 0.0, 0.2, 0.0, 0.0, 0.0, 0.0],
  heightCm: 175.5,
  weightKg: 70.0,
  bmi: 22.86,
  gender: 'neutral',
  meshReference: 'meshes/user/avatar.glb',
  isActive: true,
};

const mockClothing = {
  clothingId: CLOTHING_ID,
  vendorId: 'vendor-001',
  name: 'T-shirt test',
  category: 'top',
  fabricType: 'cotton',
  elasticityCoeff: 0.25,
  frictionCoeff: 0.55,
  weightPerSqm: 150,
  meshReference: 'meshes/clothing/test.glb',
  isActive: true,
  isDigitized: true,
};

const mockSession: TryOnSession = {
  id: SESSION_ID,
  userId: USER_ID,
  avatarId: AVATAR_ID,
  clothingId: CLOTHING_ID,
  status: SessionStatus.COMPLETED,
  animationType: AnimationType.STANDING,
  fitScore: 87.5,
  overallFit: 'good',
  simulationResult: { frameCount: 10 },
  tensionZones: [
    { zone_name: 'chest', tension_level: 'low', tension_value: 0.2 },
  ],
  simulationMs: 342,
  errorMessage: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  completedAt: new Date('2026-01-01'),
};

// Repositories mocks
const mockSessionRepo = {
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockAvatarModel = {
  findOne: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

const mockClothingModel = {
  findOne: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    if (key === 'AI_SERVICE_URL') return 'http://localhost:8000';
    return undefined;
  }),
};

describe('TryOnService', () => {
  let service: TryOnService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TryOnService,
        {
          provide: getRepositoryToken(TryOnSession),
          useValue: mockSessionRepo,
        },
        { provide: getModelToken(Avatar.name), useValue: mockAvatarModel },
        { provide: getModelToken(Clothing.name), useValue: mockClothingModel },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TryOnService>(TryOnService);
    jest.clearAllMocks();
  });

  // startTryOn — avatar introuvable
  describe('startTryOn — avatar manquant', () => {
    it('lève NotFoundException si avatar introuvable', async () => {
      mockAvatarModel.exec.mockResolvedValue(null);

      const dto: StartTryOnDto = {
        userId: USER_ID,
        avatarId: AVATAR_ID,
        clothingId: CLOTHING_ID,
        animationType: TryOnAnimationType.STANDING,
      };

      await expect(service.startTryOn(dto)).rejects.toThrow(NotFoundException);
    });
  });

  // startTryOn — vêtement introuvable
  describe('startTryOn — vêtement manquant', () => {
    it('lève NotFoundException si vêtement introuvable', async () => {
      mockAvatarModel.exec.mockResolvedValue(mockAvatar);
      mockClothingModel.exec.mockResolvedValue(null);

      // Utilisation explicite pour valider la structure ou s'assurer de sa cohérence
      expect(mockClothing.clothingId).toBe(CLOTHING_ID);

      const dto: StartTryOnDto = {
        userId: USER_ID,
        avatarId: AVATAR_ID,
        clothingId: CLOTHING_ID,
      };

      await expect(service.startTryOn(dto)).rejects.toThrow(NotFoundException);
    });
  });

  // findSession
  describe('findSession', () => {
    it('200 — retourne la session', async () => {
      mockSessionRepo.findOne.mockResolvedValue(mockSession);

      const result = await service.findSession(SESSION_ID);

      expect(result.sessionId).toBe(SESSION_ID);
      expect(result.status).toBe(SessionStatus.COMPLETED);
      expect(result.fitAnalysis.fitScore).toBe(87.5);
    });

    it('lève NotFoundException si session inexistante', async () => {
      mockSessionRepo.findOne.mockResolvedValue(null);
      await expect(service.findSession('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // findUserHistory
  describe('findUserHistory', () => {
    it('retourne un tableau de sessions', async () => {
      mockSessionRepo.find.mockResolvedValue([mockSession]);

      const result = await service.findUserHistory(USER_ID, 10);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0].userId).toBe(USER_ID);
    });

    it('retourne un tableau vide si aucune session', async () => {
      mockSessionRepo.find.mockResolvedValue([]);
      const result = await service.findUserHistory(USER_ID);
      expect(result).toHaveLength(0);
    });
  });

  // Mapper fit analysis
  describe('toFitAnalysisFromSession', () => {
    it('mappe correctement le score et les zones de tension', async () => {
      mockSessionRepo.findOne.mockResolvedValue(mockSession);
      const result = await service.findSession(SESSION_ID);

      expect(result.fitAnalysis.overallFit).toBe('good');
      expect(result.fitAnalysis.fitScore).toBe(87.5);
      expect(result.fitAnalysis.tensionZones).toHaveLength(1);
      expect(result.fitAnalysis.tensionZones[0].zoneName).toBe('chest');
    });
  });
});
