import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { appConfig, databaseConfig, jwtConfig, grpcConfig } from './config';
import { CorrelationMiddleware } from './common/middleware/correlation.middleware';
import { HealthModule } from './modules/health/health.module';
import { MeasurementsModule } from './modules/measurements/measurements.module';
import { AvatarModule } from './modules/avatar/avatar.module';
import { SessionModule } from './modules/session/session.module';
import { CatalogueModule } from './modules/catalogue/catalogue.module';
import { TryOnModule } from './modules/tryon/tryon.module';
import { VendorModule } from './modules/vendor/vendor.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    // Configuration globale
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig, jwtConfig, grpcConfig],
    }),

    // PostgreSQL via TypeORM
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.postgres.host'),
        port: config.get<number>('database.postgres.port'),
        database: config.get<string>('database.postgres.name'),
        username: config.get<string>('database.postgres.user'),
        password: config.get<string>('database.postgres.password'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get<string>('app.nodeEnv') === 'development',
        logging: config.get<string>('app.nodeEnv') === 'development',
      }),
    }),

    // MongoDB via Mongoose
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        let baseUri =
          config.get<string>('MONGO_URI') || 'mongodb://localhost:27017';

        baseUri = baseUri.trim();
        if (baseUri.endsWith('/')) {
          baseUri = baseUri.slice(0, -1);
        }

        const connectionUri = baseUri.includes('/virtufit')
          ? baseUri
          : `${baseUri}/virtufit`;

        return {
          uri: connectionUri,
          dbName: 'virtufit',
        };
      },
    }),

    HealthModule,
    MeasurementsModule,
    AvatarModule,
    SessionModule,
    CatalogueModule,
    TryOnModule,
    VendorModule,
    AnalyticsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
