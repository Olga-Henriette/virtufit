import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ZoneAnalysisDto {
  @ApiProperty({ example: 'chest' })
  zone!: string;

  @ApiProperty({ example: 0.35 })
  tensionValue!: number;

  @ApiProperty({
    example: 'medium',
    enum: ['none', 'low', 'medium', 'high', 'critical'],
  })
  tensionLevel!: string;

  @ApiProperty({
    example: -2.5,
    description: 'Différence vêtement/corps en cm',
  })
  fitDeltaCm!: number;

  @ApiProperty({ example: false })
  isConstraining!: boolean;

  @ApiPropertyOptional({
    example: 'La poitrine est serrée — préférez une coupe droite.',
  })
  recommendation!: string | null;
}

export class SizeComparisonDto {
  @ApiProperty({ example: 'M' })
  currentSize!: string;

  @ApiPropertyOptional({ example: 'L' })
  suggestedSize!: string | null;

  @ApiPropertyOptional({ example: 'S' })
  sizeDown!: string | null;

  @ApiPropertyOptional({ example: 'XL' })
  sizeUp!: string | null;

  @ApiProperty({ example: 0.85 })
  confidence!: number;
}

export class FitReportDto {
  @ApiProperty({ example: 'uuid-session-...' })
  sessionId!: string;

  @ApiProperty({ example: 'uuid-user-...' })
  userId!: string;

  @ApiProperty({ example: 'uuid-clothing-...' })
  clothingId!: string;

  @ApiProperty({ example: 82.5 })
  overallScore!: number;

  @ApiProperty({
    example: 'good',
    enum: ['perfect', 'good', 'acceptable', 'tight', 'loose'],
  })
  fitCategory!: string;

  @ApiProperty({ example: 79.0 })
  comfortScore!: number;

  @ApiProperty({ example: 85.0 })
  mobilityScore!: number;

  @ApiProperty({ type: [ZoneAnalysisDto] })
  zoneAnalyses!: ZoneAnalysisDto[];

  @ApiProperty({ type: SizeComparisonDto })
  sizeComparison!: SizeComparisonDto;

  @ApiProperty({
    example: 'Très bon ajustement — peu de retouches nécessaires.',
  })
  summary!: string;

  @ApiProperty({ type: [String] })
  recommendations!: string[];

  @ApiProperty({ type: [String] })
  styleTips!: string[];

  @ApiProperty({ example: 'cotton' })
  fabricType!: string;

  @ApiProperty({ example: 342.5 })
  simulationMs!: number;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  analyzedAt!: Date;
}
