import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TensionZoneResponseDto {
  @ApiProperty({ example: 'chest' })
  zoneName!: string;

  @ApiProperty({ example: 'medium', enum: ['low', 'medium', 'high'] })
  tensionLevel!: string;

  @ApiProperty({ example: 0.45 })
  tensionValue!: number;

  @ApiPropertyOptional({ example: 'Légère tension détectée sur chest.' })
  recommendation!: string | null;
}

export class FitAnalysisResponseDto {
  @ApiProperty({ example: 'good', enum: ['good', 'tight', 'loose'] })
  overallFit!: string;

  @ApiProperty({ example: 87.5 })
  fitScore!: number;

  @ApiProperty({ type: [TensionZoneResponseDto] })
  tensionZones!: TensionZoneResponseDto[];

  @ApiProperty({ type: [String], example: ["L'ajustement est excellent."] })
  recommendations!: string[];

  @ApiPropertyOptional({ example: 'L' })
  sizeSuggestion!: string | null;
}

export class TryOnResponseDto {
  @ApiProperty({ example: 'uuid-session-...' })
  sessionId!: string;

  @ApiProperty({ example: 'uuid-user-...' })
  userId!: string;

  @ApiProperty({ example: 'uuid-clothing-...' })
  clothingId!: string;

  @ApiProperty({ example: 'avatar-ref-...' })
  avatarId!: string;

  @ApiProperty({
    example: 'completed',
    enum: ['initiated', 'processing', 'completed', 'failed'],
  })
  status!: string;

  @ApiProperty({ example: 'standing' })
  animationType!: string;

  @ApiProperty({ type: FitAnalysisResponseDto })
  fitAnalysis!: FitAnalysisResponseDto;

  @ApiProperty({ example: 10 })
  frameCount!: number;

  @ApiProperty({ example: 342.5 })
  simulationMs!: number;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-03T00:00:01.000Z' })
  completedAt!: Date;
}
