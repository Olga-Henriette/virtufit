import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { TryOnSession } from '../session/entities/try-on-session.entity';
import { Clothing, ClothingSchema } from '../catalogue/schemas/clothing.schema';

import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TryOnSession]),
    MongooseModule.forFeature([
      { name: Clothing.name, schema: ClothingSchema },
    ]),
  ],
  controllers: [VendorController],
  providers: [VendorService],
  exports: [VendorService],
})
export class VendorModule {}
