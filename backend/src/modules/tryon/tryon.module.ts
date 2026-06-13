import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { TryOnSession } from '../session/entities/try-on-session.entity';
import { Avatar, AvatarSchema } from '../avatar/schemas/avatar.schema';
import { Clothing, ClothingSchema } from '../catalogue/schemas/clothing.schema';

import { TryOnService } from './tryon.service';
import { TryOnController } from './tryon.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TryOnSession]),
    MongooseModule.forFeature([
      { name: Avatar.name, schema: AvatarSchema },
      { name: Clothing.name, schema: ClothingSchema },
    ]),
  ],
  controllers: [TryOnController],
  providers: [TryOnService],
  exports: [TryOnService],
})
export class TryOnModule {}
