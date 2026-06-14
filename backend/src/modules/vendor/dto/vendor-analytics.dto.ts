import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Statistiques d'un vêtement

export class ClothingTensionStatsDto {
  @ApiProperty({ example: 'chest' })
  zoneName!: string;

  @ApiProperty({ example: 0.42 })
  avgTensionValue!: number;

  @ApiProperty({ example: 'medium' })
  dominantLevel!: string;

  @ApiProperty({ example: 38 })
  occurrenceCount!: number;

  @ApiProperty({ example: 72.5 })
  percentageOfSessions!: number;
}

export class ClothingPerformanceDto {
  @ApiProperty({ example: 'uuid-clothing-...' })
  clothingId!: string;

  @ApiProperty({ example: 'Chemise Oxford Bleue' })
  name!: string;

  @ApiProperty({ example: 'top' })
  category!: string;

  @ApiProperty({ example: 'cotton' })
  fabricType!: string;

  @ApiProperty({ example: 'M' })
  estimatedSize!: string;

  @ApiProperty({ example: 142 })
  totalTryOns!: number;

  @ApiProperty({ example: 84.2 })
  avgFitScore!: number;

  @ApiProperty({ example: 'good' })
  dominantFitCategory!: string;

  @ApiProperty({ example: 91.5 })
  satisfactionRate!: number;

  @ApiProperty({ type: [ClothingTensionStatsDto] })
  tensionStats!: ClothingTensionStatsDto[];

  @ApiPropertyOptional({ example: 'L' })
  recommendedSizeAdjustment!: string | null;
}

// Analytics globaux du vendeur

export class VendorCatalogueStatsDto {
  @ApiProperty({ example: 'uuid-vendor-...' })
  vendorId!: string;

  @ApiProperty({ example: 24 })
  totalClothingItems!: number;

  @ApiProperty({ example: 18 })
  digitizedItems!: number;

  @ApiProperty({ example: 1284 })
  totalTryOns!: number;

  @ApiProperty({ example: 82.7 })
  avgFitScoreAcrossCatalogue!: number;

  @ApiProperty({ example: 87.3 })
  overallSatisfactionRate!: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  periodStart!: string;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  periodEnd!: string;
}

export class TensionHotspotDto {
  @ApiProperty({ example: 'chest' })
  zoneName!: string;

  @ApiProperty({ example: 12 })
  affectedItems!: number;

  @ApiProperty({ example: 67.4 })
  percentageAffected!: number;

  @ApiProperty({ example: 'high' })
  severityLevel!: string;

  @ApiProperty({
    type: [String],
    example: ['Chemise Oxford', 'T-shirt Premium'],
  })
  topAffectedItems!: string[];
}

export class SizeDistributionDto {
  @ApiProperty({ example: 'M' })
  size!: string;

  @ApiProperty({ example: 342 })
  tryOnCount!: number;

  @ApiProperty({ example: 26.6 })
  percentage!: number;

  @ApiProperty({ example: 85.2 })
  avgFitScore!: number;
}

export class VendorDashboardDto {
  @ApiProperty({ type: VendorCatalogueStatsDto })
  catalogueStats!: VendorCatalogueStatsDto;

  @ApiProperty({ type: [ClothingPerformanceDto] })
  topPerformers!: ClothingPerformanceDto[];

  @ApiProperty({ type: [ClothingPerformanceDto] })
  needsAttention!: ClothingPerformanceDto[];

  @ApiProperty({ type: [TensionHotspotDto] })
  tensionHotspots!: TensionHotspotDto[];

  @ApiProperty({ type: [SizeDistributionDto] })
  sizeDistribution!: SizeDistributionDto[];

  @ApiProperty({ type: [String] })
  recommendations!: string[];

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  generatedAt!: string;
}

// Rapport par vêtement

export class ClothingDetailReportDto {
  @ApiProperty({ type: ClothingPerformanceDto })
  performance!: ClothingPerformanceDto;

  @ApiProperty({ type: [SizeDistributionDto] })
  sizeDistribution!: SizeDistributionDto[];

  @ApiProperty({ type: [String] })
  improvementSuggestions!: string[];

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  generatedAt!: string;
}
