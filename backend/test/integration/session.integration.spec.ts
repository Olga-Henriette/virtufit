import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Response } from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { TryOnSession } from '../../src/modules/session/entities/try-on-session.entity';
import { AvatarSnapshot } from '../../src/modules/session/entities/avatar-snapshot.entity';
import {
  Avatar,
  AvatarSchema,
} from '../../src/modules/avatar/schemas/avatar.schema';
import { SessionModule } from '../../src/modules/session/session.module';
import { SessionStatus } from '../../src/modules/session/entities/try-on-session.entity';

import {
  TEST_USER_ID,
  TEST_AVATAR_ID,
  TEST_CLOTH_ID,
} from '../fixtures/morphology.fixtures';

import { Server } from 'http';

type SessionResponse = {
  id: string;
  userId: string;
  avatarId: string;
  clothingId: string;
  status: string;
  fitScore: number | null;
};

type SessionStats = {
  totalSessions: number;
  completedSessions: number;
  failedSessions: number;
  totalSnapshots: number;
  averageFitScore: number | null;
};

describe("Session — Tests d'intégration", () => {
  let app: INestApplication<Server>;
  let createdSessionId: string;

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
          entities: [TryOnSession, AvatarSnapshot],
          synchronize: true,
          logging: false,
        }),

        MongooseModule.forRoot(
          process.env.MONGO_URI ?? 'mongodb://localhost:27017/virtufit',
        ),
        MongooseModule.forFeature([
          { name: Avatar.name, schema: AvatarSchema },
        ]),

        SessionModule,
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

  // Création de session
  describe('POST /api/v1/sessions', () => {
    it('201 — crée une session avec statut INITIATED', async () => {
      const res = await request(app.getHttpServer())
        .post('/sessions')
        .send({
          userId: TEST_USER_ID,
          avatarId: TEST_AVATAR_ID,
          clothingId: TEST_CLOTH_ID,
          animationType: 'standing',
        })
        .expect(201);

      const body = res.body as SessionResponse;
      expect(body.status).toBe(SessionStatus.INITIATED);
      expect(body.userId).toBe(TEST_USER_ID);
      expect(body.fitScore).toBeNull();

      createdSessionId = body.id;
    });

    it('400 — clothingId invalide (pas un UUID)', async () => {
      await request(app.getHttpServer())
        .post('/sessions')
        .send({
          userId: TEST_USER_ID,
          avatarId: TEST_AVATAR_ID,
          clothingId: 'not-a-uuid',
        })
        .expect(400);
    });

    it('400 — userId manquant', async () => {
      await request(app.getHttpServer())
        .post('/sessions')
        .send({
          avatarId: TEST_AVATAR_ID,
          clothingId: TEST_CLOTH_ID,
        })
        .expect(400);
    });
  });

  // Lecture d'une session
  describe('GET /api/v1/sessions/:sessionId', () => {
    it('200 — retourne la session créée', async () => {
      const res = await request(app.getHttpServer())
        .get(`/sessions/${createdSessionId}`)
        .expect(200);

      const body = res.body as SessionResponse;
      expect(body.id).toBe(createdSessionId);
      expect(body.status).toBe(SessionStatus.INITIATED);
    });

    it('404 — session inexistante', async () => {
      await request(app.getHttpServer())
        .get('/sessions/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  // Historique utilisateur
  describe('GET /api/v1/sessions/users/:userId', () => {
    it('200 — retourne un tableau de sessions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/sessions/users/${TEST_USER_ID}`)
        .expect(200);

      const body = res.body as SessionResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
    });

    it('200 — respecte la limite via query param', async () => {
      const res = await request(app.getHttpServer())
        .get(`/sessions/users/${TEST_USER_ID}?limit=1`)
        .expect(200);

      const body = res.body as SessionResponse[];
      expect(body.length).toBeLessThanOrEqual(1);
    });
  });

  // Statistiques
  describe('GET /api/v1/sessions/users/:userId/stats', () => {
    it('200 — retourne les stats avec totalSessions >= 1', async () => {
      const res = await request(app.getHttpServer())
        .get(`/sessions/users/${TEST_USER_ID}/stats`)
        .expect(200);

      const body = res.body as SessionStats;

      expect(body.totalSessions).toBeGreaterThanOrEqual(1);
      expect(body).toHaveProperty('completedSessions');
      expect(body).toHaveProperty('averageFitScore');
    });
  });
});
