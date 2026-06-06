import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsString } from 'class-validator';
import { AnimationType } from '../entities/try-on-session.entity';

export class CreateSessionDto {
  @ApiProperty({ format: 'uuid', description: "UUID de l'utilisateur" })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    description: "Référence de l'avatar actif",
  })
  @IsString()
  avatarId!: string;

  @ApiProperty({ format: 'uuid', description: 'UUID du vêtement à essayer' })
  @IsUUID()
  clothingId!: string;

  @ApiPropertyOptional({
    enum: AnimationType,
    default: AnimationType.STANDING,
  })
  @IsOptional()
  @IsEnum(AnimationType)
  animationType?: AnimationType;
}
