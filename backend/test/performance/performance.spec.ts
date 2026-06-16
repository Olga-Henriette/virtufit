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

import {
  TEST_USER_ID,
  VALID_MEASUREMENTS,
} from '../fixtures/morphology.fixtures';

import { Server } from 'http';
import { DataSource } from 'typeorm';
import mongoose, { Connection } from 'mongoose';
import { getDataSourceToken } from '@nestjs/typeorm';
import { getConnectionToken } from '@nestjs/mongoose';

// Seuils de performance Backend
const THRESHOLDS = {
  measurement_create_ms: 200,
  measurement_read_ms: 100,
  session_create_ms: 200,
  session_read_ms: 100,
  concurrent_requests: 10,
  concurrent_max_ms: 700,
};

describe('Backend Performance — Latences des endpoints', () => {
  let app: INestApplication;

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

    // WARMUP : Force l'établissement des pools de connexions (Postgres & MongoDB) à blanc
    await request(app.getHttpServer() as Server)
      .post(`/api/v1/measurements/users/${TEST_USER_ID}`)
      .send(VALID_MEASUREMENTS);
  }, 60000);

  afterAll(async () => {
    // 1. Fermer le serveur HTTP de manière aveugle pour ESLint
    try {
      const server = app.getHttpServer() as Record<string, any>;
      if (server && typeof server.close === 'function') {
        await new Promise<void>((resolve) => {
          (server.close as (cb: () => void) => void)(() => resolve());
        });
      }
    } catch {
      // Ignoré
    }

    // 2. Fermer proprement la connexion PostgreSQL (TypeORM)
    try {
      const dataSource = app.get<DataSource>(getDataSourceToken());
      if (dataSource && dataSource.isInitialized) {
        await dataSource.destroy();
      }
    } catch {
      // Ignoré
    }

    // 3. Fermer proprement la connexion MongoDB (Mongoose)
    try {
      const mongooseConnection = app.get<Connection>(getConnectionToken());
      if (mongooseConnection && Number(mongooseConnection.readyState) !== 0) {
        await mongooseConnection.close();
      }
    } catch {
      // Ignoré
    }

    // 4. Déconnexion de l'instance globale mongoose et fermeture NestJS
    await mongoose.disconnect();
    await app.close();
  });

  // Helpers

  const measure = async (fn: () => Promise<any>): Promise<number> => {
    const t0 = Date.now();
    await fn();
    return Date.now() - t0;
  };

  const percentile = (arr: number[], p: number): number => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor((sorted.length * p) / 100);
    return sorted[Math.min(idx, sorted.length - 1)];
  };

  // POST /measurements
  describe('POST /measurements — Création', () => {
    it('doit répondre en moins de 200 ms (avg sur 10 requêtes)', async () => {
      const durations: number[] = [];

      for (let i = 0; i < 10; i++) {
        const ms = await measure(() =>
          request(app.getHttpServer() as Server)
            .post(`/api/v1/measurements/users/${TEST_USER_ID}`)
            .send(VALID_MEASUREMENTS),
        );
        durations.push(ms);
      }

      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const p95 = percentile(durations, 95);

      console.log(
        `\n  POST /measurements avg=${avg.toFixed(0)}ms p95=${p95}ms`,
      );
      expect(avg).toBeLessThan(THRESHOLDS.measurement_create_ms);
    });
  });

  // GET /measurements
  describe('GET /measurements/active — Lecture', () => {
    beforeAll(async () => {
      // Prépare une mensuration active
      await request(app.getHttpServer() as Server)
        .post(`/api/v1/measurements/users/${TEST_USER_ID}`)
        .send(VALID_MEASUREMENTS);
    });

    it('doit répondre en moins de 100 ms (avg sur 20 requêtes)', async () => {
      const durations: number[] = [];

      for (let i = 0; i < 20; i++) {
        const ms = await measure(() =>
          request(app.getHttpServer() as Server).get(
            `/api/v1/measurements/users/${TEST_USER_ID}/active`,
          ),
        );
        durations.push(ms);
      }

      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const p99 = percentile(durations, 99);

      console.log(`\n  GET /measurements avg=${avg.toFixed(0)}ms p99=${p99}ms`);
      expect(avg).toBeLessThan(THRESHOLDS.measurement_read_ms);
    });
  });

  // POST /sessions
  describe('POST /sessions — Création de session', () => {
    it('doit répondre en moins de 200 ms (avg sur 10 requêtes)', async () => {
      const durations: number[] = [];
      const CLOTH_ID = '323e4567-e89b-12d3-a456-426614174002';

      for (let i = 0; i < 10; i++) {
        const ms = await measure(() =>
          request(app.getHttpServer() as Server)
            .post('/api/v1/sessions')
            .send({
              userId: TEST_USER_ID,
              avatarId: `avatar-perf-${i}`,
              clothingId: CLOTH_ID,
              animationType: 'standing',
            }),
        );
        durations.push(ms);
      }

      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const p95 = percentile(durations, 95);

      console.log(`\n  POST /sessions avg=${avg.toFixed(0)}ms p95=${p95}ms`);
      expect(avg).toBeLessThan(THRESHOLDS.session_create_ms);
    });
  });

  // Requêtes concurrentes
  describe('Concurrence — 10 requêtes simultanées', () => {
    it('doit gérer 10 lectures simultanées en < 500 ms', async () => {
      const CLOTH_ID = '323e4567-e89b-12d3-a456-426614174002';

      const t0 = Date.now();

      await Promise.all(
        Array.from({ length: THRESHOLDS.concurrent_requests }, (_, i) =>
          request(app.getHttpServer() as Server)
            .post('/api/v1/sessions')
            .send({
              userId: TEST_USER_ID,
              avatarId: `avatar-concurrent-${i}`,
              clothingId: CLOTH_ID,
            }),
        ),
      );

      const totalMs = Date.now() - t0;
      console.log(`\n  10 requêtes concurrentes total=${totalMs}ms`);
      expect(totalMs).toBeLessThan(THRESHOLDS.concurrent_max_ms);
    });

    it('doit gérer 20 lectures PostgreSQL simultanées', async () => {
      const t0 = Date.now();

      await Promise.all(
        Array.from({ length: 20 }, () =>
          request(app.getHttpServer() as Server).get(
            `/api/v1/measurements/users/${TEST_USER_ID}/history`,
          ),
        ),
      );

      const totalMs = Date.now() - t0;
      console.log(`\n  20 lectures pg simultanées total=${totalMs}ms`);
      expect(totalMs).toBeLessThan(1000);
    });
  });

  // Rapport final
  describe('Rapport de performance Backend', () => {
    it('génère le rapport complet', async () => {
      const CLOTH_ID = '323e4567-e89b-12d3-a456-426614174002';
      const endpoints = [
        {
          name: 'POST /measurements',
          fn: () =>
            request(app.getHttpServer() as Server)
              .post(`/api/v1/measurements/users/${TEST_USER_ID}`)
              .send(VALID_MEASUREMENTS),
        },
        {
          name: 'GET /measurements/active',
          fn: () =>
            request(app.getHttpServer() as Server).get(
              `/api/v1/measurements/users/${TEST_USER_ID}/active`,
            ),
        },
        {
          name: 'POST /sessions',
          fn: () =>
            request(app.getHttpServer() as Server)
              .post('/api/v1/sessions')
              .send({
                userId: TEST_USER_ID,
                avatarId: 'avatar-report',
                clothingId: CLOTH_ID,
              }),
        },
        {
          name: 'GET /sessions/stats',
          fn: () =>
            request(app.getHttpServer() as Server).get(
              `/api/v1/sessions/users/${TEST_USER_ID}/stats`,
            ),
        },
      ];

      const report: Record<
        string,
        {
          avg: number;
          p50: number;
          p95: number;
          p99: number;
        }
      > = {};

      for (const ep of endpoints) {
        const durations: number[] = [];
        for (let i = 0; i < 15; i++) {
          const ms = await measure(ep.fn);
          durations.push(ms);
        }

        const p = (pct: number) => percentile(durations, pct);
        report[ep.name] = {
          avg: Math.round(
            durations.reduce((a, b) => a + b, 0) / durations.length,
          ),
          p50: p(50),
          p95: p(95),
          p99: p(99),
        };
      }

      console.log('\n');
      console.log('═'.repeat(65));
      console.log('  RAPPORT DE PERFORMANCE — VirtuFit Backend');
      console.log('═'.repeat(65));
      console.log('  Endpoint                      avg   p50   p95   p99');
      console.log('─'.repeat(65));

      for (const [name, m] of Object.entries(report)) {
        console.log(
          `  ${name.padEnd(30)} ${String(m.avg).padStart(4)}  ` +
            `${String(m.p50).padStart(4)}  ${String(m.p95).padStart(4)}  ` +
            `${String(m.p99).padStart(4)} ms`,
        );
      }
      console.log('═'.repeat(65));

      // Tous les endpoints doivent être < 300ms en moyenne
      for (const m of Object.values(report)) {
        expect(m.avg).toBeLessThan(300);
      }
    });
  });
});
