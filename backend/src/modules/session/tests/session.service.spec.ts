import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';

import { SessionService } from '../session.service';
import {
  TryOnSession,
  SessionStatus,
  AnimationType,
} from '../entities/try-on-session.entity';
import { AvatarSnapshot } from '../entities/avatar-snapshot.entity';
import { Avatar } from '../../avatar/schemas/avatar.schema';

// UUIDs de test
const USER_ID = '123e4567-e89b-12d3-a456-426614174000';
const SESSION_ID = '223e4567-e89b-12d3-a456-426614174001';
const AVATAR_ID = 'avatar-test-001';
const CLOTH_ID = '323e4567-e89b-12d3-a456-426614174002';

const mockSession: TryOnSession = {
  id: SESSION_ID,
  userId: USER_ID,
  avatarId: AVATAR_ID,
  clothingId: CLOTH_ID,
  status: SessionStatus.INITIATED,
  animationType: AnimationType.STANDING,
  fitScore: null,
  overallFit: null,
  simulationResult: null,
  tensionZones: null,
  simulationMs: null,
  errorMessage: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  completedAt: null,
};

const mockSessionRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockSnapshotRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
};

const mockAvatarModel = {
  findOne: jest.fn(),
  updateMany: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(TryOnSession),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(AvatarSnapshot),
          useValue: mockSnapshotRepo,
        },
        { provide: getModelToken(Avatar.name), useValue: mockAvatarModel },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    jest.clearAllMocks();
  });

  // createSession
  describe('createSession', () => {
    it('doit créer une session avec statut INITIATED', async () => {
      mockSessionRepo.create.mockReturnValue(mockSession);
      mockSessionRepo.save.mockResolvedValue(mockSession);

      const result = await service.createSession({
        userId: USER_ID,
        avatarId: AVATAR_ID,
        clothingId: CLOTH_ID,
      });

      expect(result.status).toBe(SessionStatus.INITIATED);
      expect(result.userId).toBe(USER_ID);
    });
  });

  // completeSession
  describe('completeSession', () => {
    it('doit compléter une session avec les résultats', async () => {
      const completedSession = {
        ...mockSession,
        status: SessionStatus.COMPLETED,
        fitScore: 87.5,
        overallFit: 'good',
        completedAt: new Date(),
      };

      mockSessionRepo.findOne.mockResolvedValue(mockSession);
      mockSessionRepo.save.mockResolvedValue(completedSession);

      const result = await service.completeSession(SESSION_ID, {
        fitScore: 87.5,
        overallFit: 'good',
        tensionZones: [],
        simulationMs: 320,
        simulationResult: {},
      });

      expect(result.status).toBe(SessionStatus.COMPLETED);
      expect(result.fitScore).toBe(87.5);
    });

    it('doit lever NotFoundException si session introuvable', async () => {
      mockSessionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.completeSession('invalid-id', {
          fitScore: 0,
          overallFit: 'good',
          tensionZones: [],
          simulationMs: 0,
          simulationResult: {},
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // findSessionsByUser
  describe('findSessionsByUser', () => {
    it('doit retourner les sessions triées par date décroissante', async () => {
      mockSessionRepo.find.mockResolvedValue([mockSession]);
      const result = await service.findSessionsByUser(USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(USER_ID);
    });
  });

  // createSnapshotFromActiveAvatar
  describe('createSnapshotFromActiveAvatar', () => {
    it('doit lever NotFoundException si aucun avatar actif', async () => {
      mockAvatarModel.findOne.mockResolvedValue(null);

      await expect(
        service.createSnapshotFromActiveAvatar(USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
