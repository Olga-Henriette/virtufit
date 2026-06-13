import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum TryOnAnimationType {
  STANDING = 'standing',
  WALKING = 'walking',
  ROTATING = 'rotating',
}

export class StartTryOnDto {
  @ApiProperty({ format: 'uuid', description: "UUID de l'utilisateur" })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    description: "Référence de l'avatar actif (avatarId MongoDB)",
  })
  @IsString()
  avatarId!: string;

  @ApiProperty({ format: 'uuid', description: 'UUID du vêtement à essayer' })
  @IsUUID()
  clothingId!: string;

  @ApiPropertyOptional({
    enum: TryOnAnimationType,
    default: TryOnAnimationType.STANDING,
  })
  @IsOptional()
  @IsEnum(TryOnAnimationType)
  animationType?: TryOnAnimationType;
}
