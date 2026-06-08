import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ColorInfoDto {
  @ApiProperty({ type: [Number], example: [45, 62, 120] })
  dominantRgb!: number[];

  @ApiProperty({
    type: 'array',
    items: {
      type: 'array',
      items: { type: 'number' },
    },
    example: [
      [45, 62, 120],
      [120, 80, 90],
    ],
  })
  palette!: number[][];

  @ApiProperty({ example: false })
  isPatterned!: boolean;

  @ApiPropertyOptional({ example: 'stripes' })
  patternType!: string | null;
}

export class ContourInfoDto {
  @ApiProperty({ example: 420 })
  boundingWidthPx!: number;

  @ApiProperty({ example: 680 })
  boundingHeightPx!: number;

  @ApiProperty({ example: 285600.0 })
  contourAreaPx!: number;

  @ApiProperty({ example: 0.617 })
  aspectRatio!: number;

  @ApiProperty({ example: 0.82 })
  symmetryScore!: number;
}

export class ClothingResponseDto {
  @ApiProperty({ example: 'uuid-...' })
  clothingId!: string;

  @ApiProperty({ example: 'uuid-...' })
  vendorId!: string;

  @ApiProperty({ example: 'Chemise bleue slim fit' })
  name!: string;

  @ApiProperty({ example: 'top' })
  category!: string;

  @ApiProperty({ example: 'cotton' })
  fabricType!: string;

  @ApiProperty({ example: 'M' })
  estimatedSize!: string;

  @ApiProperty({ type: ColorInfoDto })
  colorInfo!: ColorInfoDto;

  @ApiProperty({ type: ContourInfoDto })
  contourInfo!: ContourInfoDto;

  @ApiProperty({ example: 0.3 })
  elasticityCoeff!: number;

  @ApiProperty({ example: 0.5 })
  frictionCoeff!: number;

  @ApiPropertyOptional({ example: 'meshes/clothing/vendor/cloth.glb' })
  meshReference!: string | null;

  @ApiPropertyOptional({ example: 'textures/clothing/vendor/cloth.png' })
  textureReference!: string | null;

  @ApiProperty({ example: true })
  isDigitized!: boolean;

  @ApiProperty({ example: 342.5 })
  digitizationMs!: number;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  createdAt!: Date;
}
