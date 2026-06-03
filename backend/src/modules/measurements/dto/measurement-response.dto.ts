import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MeasurementResponseDto {
  @ApiProperty({ example: 'uuid-...' })
  id!: string;

  @ApiProperty({ example: 'uuid-...' })
  userId!: string;

  @ApiProperty({ example: 175.5 })
  heightCm!: number;

  @ApiProperty({ example: 70.0 })
  weightKg!: number;

  @ApiProperty({ example: 95.0 })
  chestCm!: number;

  @ApiProperty({ example: 80.0 })
  waistCm!: number;

  @ApiProperty({ example: 98.0 })
  hipsCm!: number;

  @ApiProperty({ example: 45.0 })
  shoulderWidthCm!: number;

  @ApiPropertyOptional({ example: 80.0 })
  inseamCm!: number | null;

  @ApiPropertyOptional({ example: 38.0 })
  neckCm!: number | null;

  @ApiPropertyOptional({ example: 62.0 })
  armLengthCm!: number | null;

  @ApiPropertyOptional({ example: 58.0 })
  thighCm!: number | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  updatedAt!: Date;
}
