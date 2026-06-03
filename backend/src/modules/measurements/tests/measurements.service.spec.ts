import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MeasurementsService } from '../measurements.service';
import { Measurement } from '../entities/measurement.entity';
import { CreateMeasurementDto } from '../dto';

const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
const mockId = '223e4567-e89b-12d3-a456-426614174001';

const mockMeasurement: Measurement = {
  id: mockId,
  userId: mockUserId,
  heightCm: 175.5,
  weightKg: 70.0,
  chestCm: 95.0,
  waistCm: 80.0,
  hipsCm: 98.0,
  shoulderWidthCm: 45.0,
  inseamCm: null,
  neckCm: null,
  armLengthCm: null,
  thighCm: null,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

describe('MeasurementsService', () => {
  let service: MeasurementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeasurementsService,
        {
          provide: getRepositoryToken(Measurement),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MeasurementsService>(MeasurementsService);
    jest.clearAllMocks();
  });

  // create
  describe('create', () => {
    it('doit créer et retourner les mensurations', async () => {
      const dto: CreateMeasurementDto = {
        heightCm: 175.5,
        weightKg: 70.0,
        chestCm: 95.0,
        waistCm: 80.0,
        hipsCm: 98.0,
        shoulderWidthCm: 45.0,
      };

      mockRepository.create.mockReturnValue(mockMeasurement);
      mockRepository.save.mockResolvedValue(mockMeasurement);

      const result = await service.create(mockUserId, dto);

      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        ...dto,
      });
      expect(result.userId).toBe(mockUserId);
      expect(result.heightCm).toBe(175.5);
    });
  });

  // findActiveByUserId
  describe('findActiveByUserId', () => {
    it('doit retourner les mensurations actives', async () => {
      mockRepository.findOne.mockResolvedValue(mockMeasurement);
      const result = await service.findActiveByUserId(mockUserId);
      expect(result.id).toBe(mockId);
      expect(result.isActive).toBe(true);
    });

    it('doit lever NotFoundException si aucune mensuration active', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.findActiveByUserId(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // deactivate
  describe('deactivate', () => {
    it('doit désactiver la mensuration', async () => {
      mockRepository.findOne.mockResolvedValue(mockMeasurement);
      mockRepository.save.mockResolvedValue({
        ...mockMeasurement,
        isActive: false,
      });

      await service.deactivate(mockId, mockUserId);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('doit lever NotFoundException si mensuration introuvable', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.deactivate(mockId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
