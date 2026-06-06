import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Measurement } from '../../src/modules/measurements/entities/measurement.entity';
import { MeasurementsModule } from '../../src/modules/measurements/measurements.module';
import { databaseConfig } from '../../src/config';
import {
  TEST_USER_ID,
  VALID_MEASUREMENTS,
  MINIMAL_MEASUREMENTS,
  INVALID_MEASUREMENTS_BELOW_MIN,
  INVALID_MEASUREMENTS_ABOVE_MAX,
  INVALID_MEASUREMENTS_MISSING_FIELDS,
  BOUNDARY_MEASUREMENTS_MIN,
  BOUNDARY_MEASUREMENTS_MAX,
} from '../fixtures/morphology.fixtures';
import type { Server } from 'http';

type MeasurementResponse = {
  id: string;
  userId: string;
  heightCm: number;
  weightKg: number;
  chestCm?: number | null;
  inseamCm?: number | null;
  neckCm?: number | null;
  isActive: boolean;
};

type ErrorResponse = {
  statusCode: number;
  message: string | string[];
  error: string;
};

describe("Measurements — Tests d'intégration", () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [databaseConfig],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.POSTGRES_HOST ?? 'localhost',
          port: parseInt(process.env.POSTGRES_PORT ?? '5432'),
          database: process.env.POSTGRES_DB ?? 'virtufit_db',
          username: process.env.POSTGRES_USER ?? 'virtufit_user',
          password: process.env.POSTGRES_PASSWORD ?? 'virtufit_password',
          entities: [Measurement],
          synchronize: true,
          logging: false,
        }),
        MeasurementsModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Création valide
  describe('POST /api/v1/measurements/users/:userId', () => {
    it('201 — mensurations complètes valides', async () => {
      const res: Response = await request(app.getHttpServer())
        .post(`/measurements/users/${TEST_USER_ID}`)
        .send(VALID_MEASUREMENTS)
        .expect(201);

      const body = res.body as MeasurementResponse;
      expect(body.userId).toBe(TEST_USER_ID);
      expect(body.heightCm).toBe(VALID_MEASUREMENTS.heightCm);
      expect(body.isActive).toBe(true);
      expect(body.id).toBeDefined();
    });

    it('201 — mensurations minimales (champs optionnels absents)', async () => {
      const res: Response = await request(app.getHttpServer())
        .post(`/measurements/users/${TEST_USER_ID}`)
        .send(MINIMAL_MEASUREMENTS)
        .expect(201);

      const body = res.body as MeasurementResponse;
      expect(body.inseamCm).toBeNull();
      expect(body.neckCm).toBeNull();
    });

    it('201 — valeurs aux limites minimales exactes', async () => {
      const res: Response = await request(app.getHttpServer())
        .post(`/measurements/users/${TEST_USER_ID}`)
        .send(BOUNDARY_MEASUREMENTS_MIN)
        .expect(201);

      const body = res.body as MeasurementResponse;
      expect(body.heightCm).toBe(50.0);
      expect(body.weightKg).toBe(20.0);
    });

    it('201 — valeurs aux limites maximales exactes', async () => {
      const res: Response = await request(app.getHttpServer())
        .post(`/measurements/users/${TEST_USER_ID}`)
        .send(BOUNDARY_MEASUREMENTS_MAX)
        .expect(201);

      const body = res.body as MeasurementResponse;
      expect(body.heightCm).toBe(250.0);
      expect(body.weightKg).toBe(300.0);
    });

    it('400 — hauteur en dessous du minimum (30 cm)', async () => {
      await request(app.getHttpServer())
        .post(`/measurements/users/${TEST_USER_ID}`)
        .send(INVALID_MEASUREMENTS_BELOW_MIN)
        .expect(400);
    });

    it('400 — hauteur au dessus du maximum (300 cm)', async () => {
      await request(app.getHttpServer())
        .post(`/measurements/users/${TEST_USER_ID}`)
        .send(INVALID_MEASUREMENTS_ABOVE_MAX)
        .expect(400);
    });

    it('400 — champ obligatoire manquant (chestCm)', async () => {
      await request(app.getHttpServer())
        .post(`/measurements/users/${TEST_USER_ID}`)
        .send(INVALID_MEASUREMENTS_MISSING_FIELDS)
        .expect(400);
    });

    it('400 — userId invalide (pas un UUID)', async () => {
      await request(app.getHttpServer())
        .post('/measurements/users/not-a-uuid')
        .send(VALID_MEASUREMENTS)
        .expect(400);
    });

    it('400 — champ inconnu rejeté (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post(`/measurements/users/${TEST_USER_ID}`)
        .send({ ...VALID_MEASUREMENTS, unknownField: 'value' })
        .expect(400);
    });
  });

  // Lecture
  describe('GET /api/v1/measurements/users/:userId/active', () => {
    it('200 — retourne les mensurations actives', async () => {
      // Crée d'abord une mensuration
      await request(app.getHttpServer())
        .post(`/measurements/users/${TEST_USER_ID}`)
        .send(VALID_MEASUREMENTS);

      const res: Response = await request(app.getHttpServer())
        .get(`/measurements/users/${TEST_USER_ID}/active`)
        .expect(200);

      const body = res.body as MeasurementResponse;
      expect(body.userId).toBe(TEST_USER_ID);
      expect(body.isActive).toBe(true);
    });
  });

  // Historique
  describe('GET /api/v1/measurements/users/:userId/history', () => {
    it('200 — retourne un tableau (peut être vide)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/measurements/users/${TEST_USER_ID}/history`)
        .expect(200);

      const body = res.body as MeasurementResponse[];
      expect(Array.isArray(body)).toBe(true);
    });
    it('400 — userId invalide (pas un UUID)', async () => {
      const res = await request(app.getHttpServer())
        .get('/measurements/users/not-a-uuid/history')
        .expect(400);
      const body = res.body as ErrorResponse;
      expect(body.error).toBeDefined();
    });
  });
});
