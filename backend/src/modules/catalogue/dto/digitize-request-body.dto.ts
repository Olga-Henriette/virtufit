import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ClothingCategory } from './digitize-clothing.dto';

export class DigitizeClothingBodyDto {
  @IsUUID()
  clothingId!: string;

  @IsUUID()
  vendorId!: string;

  @IsEnum(ClothingCategory)
  category!: ClothingCategory;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  viewAngles?: string;
}
