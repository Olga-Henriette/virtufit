import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export enum GenderEnum {
  MALE = 'male',
  FEMALE = 'female',
  NEUTRAL = 'neutral',
}

export class MeasurementsDto {
  @ApiProperty({ example: 175.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(50)
  @Max(250)
  @Type(() => Number)
  heightCm!: number;

  @ApiProperty({ example: 70.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(20)
  @Max(300)
  @Type(() => Number)
  weightKg!: number;

  @ApiProperty({ example: 95.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(40)
  @Max(200)
  @Type(() => Number)
  chestCm!: number;

  @ApiProperty({ example: 80.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(40)
  @Max(200)
  @Type(() => Number)
  waistCm!: number;

  @ApiProperty({ example: 98.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(40)
  @Max(200)
  @Type(() => Number)
  hipsCm!: number;

  @ApiProperty({ example: 45.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(20)
  @Max(80)
  @Type(() => Number)
  shoulderWidthCm!: number;

  @ApiPropertyOptional({ example: 80.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(40)
  @Max(120)
  @Type(() => Number)
  inseamCm?: number;

  @ApiPropertyOptional({ example: 38.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(20)
  @Max(70)
  @Type(() => Number)
  neckCm?: number;

  @ApiPropertyOptional({ example: 62.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(30)
  @Max(100)
  @Type(() => Number)
  armLengthCm?: number;

  @ApiPropertyOptional({ example: 58.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(30)
  @Max(120)
  @Type(() => Number)
  thighCm?: number;

  @ApiPropertyOptional({ enum: GenderEnum, default: GenderEnum.NEUTRAL })
  @IsOptional()
  @IsEnum(GenderEnum)
  gender?: GenderEnum;
}

export class GenerateAvatarDto {
  @ApiProperty({ description: "UUID de l'utilisateur", format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ type: MeasurementsDto })
  @ValidateNested()
  @Type(() => MeasurementsDto)
  measurements!: MeasurementsDto;
}
