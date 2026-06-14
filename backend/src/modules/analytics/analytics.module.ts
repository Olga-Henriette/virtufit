import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { TryOnSession } from '../session/entities/try-on-session.entity';
import { AvatarSnapshot } from '../session/entities/avatar-snapshot.entity';
import { Clothing, ClothingSchema } from '../catalogue/schemas/clothing.schema';

import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TryOnSession, AvatarSnapshot]),
    MongooseModule.forFeature([
      { name: Clothing.name, schema: ClothingSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
