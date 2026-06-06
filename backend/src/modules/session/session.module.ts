import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { TryOnSession } from './entities/try-on-session.entity';
import { AvatarSnapshot } from './entities/avatar-snapshot.entity';
import { Avatar, AvatarSchema } from '../avatar/schemas/avatar.schema';

import { SessionService } from './session.service';
import { SessionController } from './session.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TryOnSession, AvatarSnapshot]),
    MongooseModule.forFeature([{ name: Avatar.name, schema: AvatarSchema }]),
  ],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
