import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PersonalizeAvatarDto {
  @ApiProperty({ description: "UUID de l'utilisateur", format: 'uuid' })
  @IsUUID()
  userId!: string;
}
