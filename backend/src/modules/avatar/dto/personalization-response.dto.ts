import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PersonalizationResponseDto {
  @ApiProperty({ example: 'uuid-...' })
  avatarId!: string;

  @ApiProperty({ example: 'uuid-...' })
  userId!: string;

  @ApiProperty({ example: 'photos/user-uuid/photo-uuid.jpg' })
  photoReference!: string;

  @ApiProperty({ example: 'medium', description: 'Ton de peau détecté' })
  skinTone!: string;

  @ApiProperty({
    example: 'dark_brown',
    description: 'Couleur de cheveux détectée',
  })
  hairColor!: string;

  @ApiPropertyOptional({ type: [Number], example: [180, 140, 110] })
  skinRgb!: number[];

  @ApiPropertyOptional({ type: [Number], example: [60, 40, 30] })
  hairRgb!: number[];

  @ApiProperty({ example: 0.82 })
  confidenceScore!: number;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  updatedAt!: Date;
}
