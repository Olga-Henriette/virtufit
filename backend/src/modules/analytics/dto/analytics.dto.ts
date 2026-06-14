import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Granularité temporelle

export enum TimePeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

// Métriques temporelles

export class TimeSeriesPointDto {
  @ApiProperty({ example: '2026-06-03' })
  date!: string;

  @ApiProperty({ example: 42 })
  count!: number;

  @ApiProperty({ example: 83.5 })
  avgFitScore!: number;

  @ApiPropertyOptional({ example: 12 })
  completedCount?: number;

  @ApiPropertyOptional({ example: 3 })
  failedCount?: number;
}

// Analytics utilisateur

export class UserFitProfileDto {
  @ApiProperty({ example: 'uuid-user-...' })
  userId!: string;

  @ApiProperty({ example: 47 })
  totalTryOns!: number;

  @ApiProperty({ example: 84.2 })
  avgFitScore!: number;

  @ApiProperty({ example: 'good' })
  preferredFitCategory!: string;

  @ApiProperty({ type: [String], example: ['top', 'dress'] })
  preferredCategories!: string[];

  @ApiProperty({ type: [String], example: ['cotton', 'silk'] })
  preferredFabrics!: string[];

  @ApiProperty({ example: 'M' })
  mostCommonSize!: string;

  @ApiProperty({ example: 91.3 })
  satisfactionRate!: number;

  @ApiProperty({ type: [TimeSeriesPointDto] })
  fitScoreTrend!: TimeSeriesPointDto[];

  @ApiProperty({ example: '2026-01-15T00:00:00.000Z' })
  firstTryOnDate!: string;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  lastTryOnDate!: string;
}

// Analytics plateforme

export class PlatformOverviewDto {
  @ApiProperty({ example: 15284 })
  totalTryOns!: number;

  @ApiProperty({ example: 13102 })
  completedTryOns!: number;

  @ApiProperty({ example: 82.1 })
  avgFitScore!: number;

  @ApiProperty({ example: 87.4 })
  completionRate!: number;

  @ApiProperty({ example: 342.8 })
  avgSimulationMs!: number;

  @ApiProperty({ example: 1842 })
  uniqueUsers!: number;

  @ApiProperty({ example: 847 })
  uniqueClothingItems!: number;
}

export class CategoryBreakdownDto {
  @ApiProperty({ example: 'top' })
  category!: string;

  @ApiProperty({ example: 4821 })
  tryOnCount!: number;

  @ApiProperty({ example: 31.5 })
  percentage!: number;

  @ApiProperty({ example: 83.7 })
  avgFitScore!: number;

  @ApiProperty({ example: 88.2 })
  satisfactionRate!: number;
}

export class FabricBreakdownDto {
  @ApiProperty({ example: 'cotton' })
  fabricType!: string;

  @ApiProperty({ example: 5123 })
  tryOnCount!: number;

  @ApiProperty({ example: 33.5 })
  percentage!: number;

  @ApiProperty({ example: 85.1 })
  avgFitScore!: number;
}

export class SimulationPerformanceDto {
  @ApiProperty({ example: 342.8 })
  avgMs!: number;

  @ApiProperty({ example: 215.0 })
  p50Ms!: number;

  @ApiProperty({ example: 620.0 })
  p95Ms!: number;

  @ApiProperty({ example: 980.0 })
  p99Ms!: number;

  @ApiProperty({ example: 125 })
  minMs!: number;

  @ApiProperty({ example: 2840 })
  maxMs!: number;

  @ApiProperty({ example: 98.6 })
  successRate!: number;
}

export class PlatformAnalyticsDto {
  @ApiProperty({ type: PlatformOverviewDto })
  overview!: PlatformOverviewDto;

  @ApiProperty({ type: [CategoryBreakdownDto] })
  categoryBreakdown!: CategoryBreakdownDto[];

  @ApiProperty({ type: [FabricBreakdownDto] })
  fabricBreakdown!: FabricBreakdownDto[];

  @ApiProperty({ type: SimulationPerformanceDto })
  simulationPerformance!: SimulationPerformanceDto;

  @ApiProperty({ type: [TimeSeriesPointDto] })
  timeSeries!: TimeSeriesPointDto[];

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  generatedAt!: string;
}

// Export de données

export class ExportRowDto {
  @ApiProperty({ example: '2026-06-03' })
  date!: string;

  @ApiProperty({ example: 'uuid-session-...' })
  sessionId!: string;

  @ApiProperty({ example: 'uuid-user-...' })
  userId!: string;

  @ApiProperty({ example: 'uuid-clothing-...' })
  clothingId!: string;

  @ApiProperty({ example: 'top' })
  category!: string;

  @ApiProperty({ example: 'cotton' })
  fabricType!: string;

  @ApiProperty({ example: 'standing' })
  animationType!: string;

  @ApiProperty({ example: 'completed' })
  status!: string;

  @ApiProperty({ example: 84.5 })
  fitScore!: number;

  @ApiProperty({ example: 'good' })
  overallFit!: string;

  @ApiProperty({ example: 342 })
  simulationMs!: number;
}

export class ExportResponseDto {
  @ApiProperty({ example: 1284 })
  totalRows!: number;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  exportedAt!: string;

  @ApiProperty({ type: [ExportRowDto] })
  data!: ExportRowDto[];
}
