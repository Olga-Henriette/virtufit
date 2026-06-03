import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class UpdateMeasurementDto {
  @ApiPropertyOptional({ example: 176.0, minimum: 50, maximum: 250 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(50)
  @Max(250)
  @Type(() => Number)
  heightCm?: number;

  @ApiPropertyOptional({ example: 71.0, minimum: 20, maximum: 300 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(20)
  @Max(300)
  @Type(() => Number)
  weightKg?: number;

  @ApiPropertyOptional({ example: 96.0, minimum: 40, maximum: 200 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(40)
  @Max(200)
  @Type(() => Number)
  chestCm?: number;

  @ApiPropertyOptional({ example: 81.0, minimum: 40, maximum: 200 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(40)
  @Max(200)
  @Type(() => Number)
  waistCm?: number;

  @ApiPropertyOptional({ example: 99.0, minimum: 40, maximum: 200 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(40)
  @Max(200)
  @Type(() => Number)
  hipsCm?: number;

  @ApiPropertyOptional({ example: 46.0, minimum: 20, maximum: 80 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(20)
  @Max(80)
  @Type(() => Number)
  shoulderWidthCm?: number;

  @ApiPropertyOptional({ example: 81.0, minimum: 40, maximum: 120 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(40)
  @Max(120)
  @Type(() => Number)
  inseamCm?: number;

  @ApiPropertyOptional({ example: 39.0, minimum: 20, maximum: 70 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(20)
  @Max(70)
  @Type(() => Number)
  neckCm?: number;

  @ApiPropertyOptional({ example: 63.0, minimum: 30, maximum: 100 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(30)
  @Max(100)
  @Type(() => Number)
  armLengthCm?: number;

  @ApiPropertyOptional({ example: 59.0, minimum: 30, maximum: 120 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(30)
  @Max(120)
  @Type(() => Number)
  thighCm?: number;
}
