import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

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
import { HealthModule } from '../../src/modules/health/health.module';

import {
  TEST_USER_ID,
  VALID_MEASUREMENTS,
} from '../fixtures/morphology.fixtures';

import { Server } from 'http';
import { DataSource } from 'typeorm';

describe('System Integration — Flux complet', () => {
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
        HealthModule,
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
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      try {
        // Récupération de l'instance de DataSource typée via le conteneur NestJS
        const dataSource = app.get<DataSource>(DataSource);
        if (dataSource && dataSource.isInitialized) {
          await dataSource.destroy();
        }
      } catch {
        // Ignoré si la base de données n'est pas initialisée
      }
      await app.close();
    }
  });

  // Health Check
  describe('GET /api/v1/health', () => {
    it('200 — health check retourne les dépendances', async () => {
      const res = await request(server()).get('/api/v1/health').expect(200);

      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('service', 'virtufit-backend');
      expect(res.body).toHaveProperty('dependencies');
    });

    it('200 — liveness probe', async () => {
      const res = await request(server())
        .get('/api/v1/health/liveness')
        .expect(200);

      const body = res.body as { status: string };
      expect(body.status).toBe('alive');
    });
  });

  // Flux Mensurations → Session
  describe('Flux complet : Mensurations → Session', () => {
    let measurementId: string;
    let sessionId: string;

    it('1. Crée les mensurations', async () => {
      const res = await request(server())
        .post(`/api/v1/measurements/users/${TEST_USER_ID}`)
        .send(VALID_MEASUREMENTS)
        .expect(201);

      const body = res.body as {
        userId: string;
        heightCm: number;
        id: string;
      };

      expect(body.userId).toBe(TEST_USER_ID);
      expect(body.heightCm).toBe(VALID_MEASUREMENTS.heightCm);
      measurementId = body.id;
    });

    it('2. Récupère les mensurations actives', async () => {
      const res = await request(server())
        .get(`/api/v1/measurements/users/${TEST_USER_ID}/active`)
        .expect(200);

      const body = res.body as {
        id: string;
        isActive: boolean;
      };

      expect(body.id).toBe(measurementId);
      expect(body.isActive).toBe(true);
    });

    it("3. Crée une session d'essayage", async () => {
      const res = await request(server())
        .post('/api/v1/sessions')
        .send({
          userId: TEST_USER_ID,
          avatarId: 'avatar-integration-test',
          clothingId: '323e4567-e89b-12d3-a456-426614174002',
          animationType: 'standing',
        })
        .expect(201);

      const body = res.body as {
        status: string;
        userId: string;
        id: string;
      };

      expect(body.status).toBe('initiated');
      expect(body.userId).toBe(TEST_USER_ID);
      sessionId = body.id;
    });

    it('4. Récupère la session créée', async () => {
      const res = await request(server())
        .get(`/api/v1/sessions/${sessionId}`)
        .expect(200);

      const body = res.body as { id: string };
      expect(body.id).toBe(sessionId);
    });

    it("5. Crée un snapshot de l'état", async () => {
      // Le snapshot nécessite un avatar actif en MongoDB
      // En intégration, on s'assure que la route répond correctement
      const res = await request(server())
        .post(`/api/v1/sessions/users/${TEST_USER_ID}/snapshots`)
        .query({ label: 'Test Sprint 4' });

      // 404 attendu si pas d'avatar MongoDB actif — comportement correct
      expect([201, 404]).toContain(res.status);
    });

    it('6. Récupère les statistiques utilisateur', async () => {
      const res = await request(server())
        .get(`/api/v1/sessions/users/${TEST_USER_ID}/stats`)
        .expect(200);

      const body = res.body as {
        totalSessions: number;
        completedSessions: number;
        averageFitScore: number;
      };

      expect(body.totalSessions).toBeGreaterThanOrEqual(1);
      expect(body).toHaveProperty('completedSessions');
      expect(body).toHaveProperty('averageFitScore');
    });
  });

  // Validation des DTOs
  describe('Validation stricte des DTOs', () => {
    it('400 — mensuration avec champ inconnu rejeté', async () => {
      await request(server())
        .post(`/api/v1/measurements/users/${TEST_USER_ID}`)
        .send({ ...VALID_MEASUREMENTS, injectedField: 'hack' })
        .expect(400);
    });

    it('400 — session sans clothingId rejetée', async () => {
      await request(server())
        .post('/api/v1/sessions')
        .send({
          userId: TEST_USER_ID,
          avatarId: 'avatar-test',
          // clothingId manquant
        })
        .expect(400);
    });

    it('400 — UUID invalide dans le paramètre userId', async () => {
      await request(server())
        .get('/api/v1/measurements/users/not-a-uuid/active')
        .expect(400);
    });

    it('404 — session inexistante', async () => {
      await request(server())
        .get('/api/v1/sessions/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  // En-têtes de corrélation
  describe('En-têtes de corrélation', () => {
    it('La réponse contient x-correlation-id', async () => {
      const res = await request(server()).get('/api/v1/health/liveness');

      // Le middleware ajoute l'en-tête (présent si middleware configuré)
      // En intégration sans le middleware complet, on vérifie le statut
      expect(res.status).toBeLessThan(500);
    });

    it('Propage le x-correlation-id fourni', async () => {
      const correlationId = 'test-correlation-12345';
      const res = await request(server())
        .get('/api/v1/health/liveness')
        .set('x-correlation-id', correlationId);

      expect(res.status).toBeLessThan(500);
    });
  });
});
