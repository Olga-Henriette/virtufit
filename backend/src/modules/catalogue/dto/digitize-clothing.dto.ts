import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum ClothingCategory {
  TOP = 'top',
  BOTTOM = 'bottom',
  DRESS = 'dress',
  OUTERWEAR = 'outerwear',
  UNDERWEAR = 'underwear',
}

export enum ViewAngle {
  FRONT = 'front',
  BACK = 'back',
  LEFT = 'left',
  RIGHT = 'right',
  DETAIL = 'detail',
}

export class DigitizeClothingDto {
  @ApiProperty({ format: 'uuid', description: 'UUID du vêtement' })
  @IsUUID()
  clothingId!: string;

  @ApiProperty({ format: 'uuid', description: 'UUID du vendeur' })
  @IsUUID()
  vendorId!: string;

  @ApiProperty({ enum: ClothingCategory })
  @IsEnum(ClothingCategory)
  category!: ClothingCategory;

  @ApiPropertyOptional({ description: 'Nom du vêtement' })
  @IsOptional()
  @IsString()
  name?: string;
}
