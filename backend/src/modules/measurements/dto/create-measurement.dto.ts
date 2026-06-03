import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export class CreateMeasurementDto {
  // Obligatoires
  @ApiProperty({
    description: 'Taille en centimètres',
    example: 175.5,
    minimum: 50,
    maximum: 250,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(50)
  @Max(250)
  @Type(() => Number)
  heightCm!: number;

  @ApiProperty({
    description: 'Poids en kilogrammes',
    example: 70.0,
    minimum: 20,
    maximum: 300,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(20)
  @Max(300)
  @Type(() => Number)
  weightKg!: number;

  @ApiProperty({
    description: 'Tour de poitrine en centimètres',
    example: 95.0,
    minimum: 40,
    maximum: 200,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(40)
  @Max(200)
  @Type(() => Number)
  chestCm!: number;

  @ApiProperty({
    description: 'Tour de taille en centimètres',
    example: 80.0,
    minimum: 40,
    maximum: 200,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(40)
  @Max(200)
  @Type(() => Number)
  waistCm!: number;

  @ApiProperty({
    description: 'Tour de hanches en centimètres',
    example: 98.0,
    minimum: 40,
    maximum: 200,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(40)
  @Max(200)
  @Type(() => Number)
  hipsCm!: number;

  @ApiProperty({
    description: 'Largeur des épaules en centimètres',
    example: 45.0,
    minimum: 20,
    maximum: 80,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(20)
  @Max(80)
  @Type(() => Number)
  shoulderWidthCm!: number;

  // Optionnels
  @ApiPropertyOptional({
    description: 'Entrejambe en centimètres',
    example: 80.0,
    minimum: 40,
    maximum: 120,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(40)
  @Max(120)
  @Type(() => Number)
  inseamCm?: number;

  @ApiPropertyOptional({
    description: 'Tour de cou en centimètres',
    example: 38.0,
    minimum: 20,
    maximum: 70,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(20)
  @Max(70)
  @Type(() => Number)
  neckCm?: number;

  @ApiPropertyOptional({
    description: 'Longueur du bras en centimètres',
    example: 62.0,
    minimum: 30,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(30)
  @Max(100)
  @Type(() => Number)
  armLengthCm?: number;

  @ApiPropertyOptional({
    description: 'Tour de cuisse en centimètres',
    example: 58.0,
    minimum: 30,
    maximum: 120,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(30)
  @Max(120)
  @Type(() => Number)
  thighCm?: number;
}
