import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { Measurement } from '../../src/modules/measurements/entities/measurement.entity';
import { TryOnSession } from '../../src/modules/session/entities/try-on-session.entity';
import { AvatarSnapshot } from '../../src/modules/session/entities/avatar-snapshot.entity';
import {
  Avatar,
  AvatarSchema,
} from '../../src/modules/avatar/schemas/avatar.schema';
import {
  Clothing,
  ClothingSchema,
} from '../../src/modules/catalogue/schemas/clothing.schema';
import { MeasurementsModule } from '../../src/modules/measurements/measurements.module';
import { SessionModule } from '../../src/modules/session/session.module';

import {
  TEST_USER_ID,
  VALID_MEASUREMENTS,
} from '../fixtures/morphology.fixtures';

import { Server } from 'http';

describe('Data Consistency — PostgreSQL ↔ MongoDB', () => {
  let app: INestApplication;

  const server = () => app.getHttpServer() as Server;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),

        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.POSTGRES_HOST ?? 'localhost',
          port: parseInt(process.env.POSTGRES_PORT ?? '5432'),
          database: process.env.POSTGRES_DB ?? 'virtufit_db',
          username: process.env.POSTGRES_USER ?? 'virtufit_user',
          password: process.env.POSTGRES_PASSWORD ?? 'virtufit_password',
          entities: [Measurement, TryOnSession, AvatarSnapshot],
          synchronize: true,
          logging: false,
        }),

        MongooseModule.forRoot(
          process.env.MONGO_URI ?? 'mongodb://localhost:27017/virtufit',
        ),
        MongooseModule.forFeature([
          { name: Avatar.name, schema: AvatarSchema },
          { name: Clothing.name, schema: ClothingSchema },
        ]),

        MeasurementsModule,
        SessionModule,
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      try {
        // Récupération propre de la source de données via NestJS sans aucun require ou any
        const dataSource = app.get<DataSource>(DataSource);
        if (dataSource && dataSource.isInitialized) {
          await dataSource.destroy();
        }
      } catch {
        // logs de secours
      }
      await app.close();
    }
  });

  // Cohérence des mensurations
  describe('Cohérence des mensurations PostgreSQL', () => {
    it('Crée et récupère avec les mêmes valeurs', async () => {
      await request(server())
        .post(`/api/v1/measurements/users/${TEST_USER_ID}`)
        .send(VALID_MEASUREMENTS)
        .expect(201);

      const activeRes = await request(server())
        .get(`/api/v1/measurements/users/${TEST_USER_ID}/active`)
        .expect(200);

      const measurementsData = activeRes.body as {
        heightCm: number;
        weightKg: number;
        chestCm: number;
      };

      // Les valeurs doivent être identiques après lecture
      expect(measurementsData.heightCm).toBe(VALID_MEASUREMENTS.heightCm);
      expect(measurementsData.weightKg).toBe(VALID_MEASUREMENTS.weightKg);
      expect(measurementsData.chestCm).toBe(VALID_MEASUREMENTS.chestCm);
    });

    it('Désactive une mensuration et vérifie la cohérence', async () => {
      // Crée une mensuration
      const createRes = await request(server())
        .post(`/api/v1/measurements/users/${TEST_USER_ID}`)
        .send(VALID_MEASUREMENTS)
        .expect(201);

      const { id, userId } = createRes.body as { id: string; userId: string };

      // Désactive-la
      await request(server())
        .delete(`/api/v1/measurements/${id}/users/${userId}`)
        .expect(204);

      // Vérifie que l'historique la contient toujours
      const historyRes = await request(server())
        .get(`/api/v1/measurements/users/${TEST_USER_ID}/history`)
        .expect(200);

      const historyData = historyRes.body as Array<{
        id: string;
        isActive: boolean;
      }>;
      const found = historyData.find((m) => m.id === id);
      expect(found).toBeDefined();
      expect(found?.isActive).toBe(false);
    });
  });

  // Cohérence des sessions
  describe('Cohérence des sessions PostgreSQL', () => {
    it("La session créée apparaît dans l'historique et les stats", async () => {
      const CLOTH_ID = '323e4567-e89b-12d3-a456-426614174002';

      const createRes = await request(server())
        .post('/api/v1/sessions')
        .send({
          userId: TEST_USER_ID,
          avatarId: 'avatar-consistency-test',
          clothingId: CLOTH_ID,
          animationType: 'standing',
        })
        .expect(201);

      const { id: sessionId } = createRes.body as { id: string };

      // Vérifie dans l'historique
      const historyRes = await request(server())
        .get(`/api/v1/sessions/users/${TEST_USER_ID}`)
        .expect(200);

      const historyData = historyRes.body as Array<{ id: string }>;
      const found = historyData.find((s) => s.id === sessionId);
      expect(found).toBeDefined();

      // Vérifie dans les stats
      const statsRes = await request(server())
        .get(`/api/v1/sessions/users/${TEST_USER_ID}/stats`)
        .expect(200);

      const statsBody = statsRes.body as { totalSessions: number };
      expect(statsBody.totalSessions).toBeGreaterThanOrEqual(1);
    });
  });

  // Intégrité des UUIDs
  describe('Intégrité des identifiants', () => {
    it("L'ID généré est un UUID valide", async () => {
      const res = await request(server())
        .post(`/api/v1/measurements/users/${TEST_USER_ID}`)
        .send(VALID_MEASUREMENTS)
        .expect(201);

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect((res.body as { id: string }).id).toMatch(uuidRegex);
    });

    it('Deux entités créées ont des IDs différents', async () => {
      const [r1, r2] = await Promise.all([
        request(server()).post('/api/v1/sessions').send({
          userId: TEST_USER_ID,
          avatarId: 'avatar-uuid-test-1',
          clothingId: '323e4567-e89b-12d3-a456-426614174002',
        }),
        request(server()).post('/api/v1/sessions').send({
          userId: TEST_USER_ID,
          avatarId: 'avatar-uuid-test-2',
          clothingId: '323e4567-e89b-12d3-a456-426614174002',
        }),
      ]);

      expect((r1.body as { id: string })?.id).not.toBe(
        (r2.body as { id: string })?.id,
      );
    });
  });

  // Gestion des erreurs
  describe('Gestion cohérente des erreurs', () => {
    it("404 retourne le bon format d'erreur", async () => {
      const res = await request(server())
        .get('/api/v1/sessions/00000000-0000-0000-0000-000000000000')
        .expect(404);

      const body = res.body as Record<string, unknown>;

      expect(body).toHaveProperty('statusCode', 404);
      expect(body).toHaveProperty('message');
    });

    it('400 retourne les détails de validation', async () => {
      const res = await request(server())
        .post(`/api/v1/measurements/users/${TEST_USER_ID}`)
        .send({ heightCm: 30 }) // invalide + champs manquants
        .expect(400);

      const body = res.body as Record<string, unknown>;

      expect(body.statusCode).toBe(400);
      expect(body.message).toBeDefined();
    });
  });
});
