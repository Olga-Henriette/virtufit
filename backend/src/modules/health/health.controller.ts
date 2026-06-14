import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { InjectDataSource } from '@nestjs/typeorm';
import { Connection } from 'mongoose';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly pgDataSource: DataSource,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check complet du Backend' })
  async check(): Promise<Record<string, unknown>> {
    const [pgStatus, mongoStatus] = await Promise.all([
      this._checkPostgres(),
      this._checkMongo(),
    ]);

    const allHealthy = pgStatus.status === 'up' && mongoStatus.status === 'up';

    return {
      status: allHealthy ? 'ok' : 'degraded',
      service: 'virtufit-backend',
      version: '1.0.0',
      environment: this.configService.get<string>('app.nodeEnv', 'development'),
      timestamp: new Date().toISOString(),
      dependencies: {
        postgresql: pgStatus,
        mongodb: mongoStatus,
      },
    };
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Liveness probe (Kubernetes)' })
  liveness(): Record<string, string> {
    return { status: 'alive' };
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Readiness probe (Kubernetes)' })
  async readiness(): Promise<Record<string, unknown>> {
    const [pg, mongo] = await Promise.all([
      this._checkPostgres(),
      this._checkMongo(),
    ]);

    const ready = pg.status === 'up' && mongo.status === 'up';
    return {
      ready,
      checks: { postgresql: pg, mongodb: mongo },
    };
  }

  // Vérifications des dépendances

  private async _checkPostgres(): Promise<Record<string, string>> {
    try {
      await this.pgDataSource.query('SELECT 1');
      return { status: 'up', message: 'PostgreSQL connecté' };
    } catch (err) {
      return {
        status: 'down',
        message: err instanceof Error ? err.message : 'Erreur PostgreSQL',
      };
    }
  }

  private _checkMongo(): Promise<Record<string, string>> {
    try {
      const state = this.mongoConnection.readyState;
      // 1 = connected
      if (Number(state) === 1) {
        return Promise.resolve({ status: 'up', message: 'MongoDB connecté' });
      }
      return Promise.resolve({
        status: 'down',
        message: `MongoDB état: ${state}`,
      });
    } catch (err) {
      return Promise.resolve({
        status: 'down',
        message: err instanceof Error ? err.message : 'Erreur MongoDB',
      });
    }
  }
}
