import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { TryOnSession } from '../session/entities/try-on-session.entity';
import { Avatar, AvatarSchema } from '../avatar/schemas/avatar.schema';
import { Clothing, ClothingSchema } from '../catalogue/schemas/clothing.schema';

import { TryOnService } from './tryon.service';
import { TryOnController } from './tryon.controller';
import { ClothingGateway } from './clothing.gateway';
import { FitReportService } from './fit-report.service';
import { FitReportController } from './fit-report.controller';
import { AsyncTaskGateway } from './async-task.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([TryOnSession]),
    MongooseModule.forFeature([
      { name: Avatar.name, schema: AvatarSchema },
      { name: Clothing.name, schema: ClothingSchema },
    ]),
  ],
  controllers: [TryOnController, FitReportController],
  providers: [
    TryOnService,
    ClothingGateway,
    FitReportService,
    AsyncTaskGateway,
  ],
  exports: [TryOnService, ClothingGateway, FitReportService, AsyncTaskGateway],
})
export class TryOnModule {}
