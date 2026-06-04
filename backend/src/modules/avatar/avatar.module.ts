import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Avatar, AvatarSchema } from './schemas/avatar.schema';
import { AvatarService } from './avatar.service';
import { AvatarController } from './avatar.controller';
import { PersonalizationService } from './personalization.service';
import { PersonalizationController } from './personalization.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Avatar.name, schema: AvatarSchema }]),
  ],
  controllers: [AvatarController, PersonalizationController],
  providers: [AvatarService, PersonalizationService],
  exports: [AvatarService, PersonalizationService],
})
export class AvatarModule {}
