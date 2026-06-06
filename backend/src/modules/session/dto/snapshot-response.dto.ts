import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SnapshotResponseDto {
  @ApiProperty({ example: 'uuid-...' })
  id!: string;

  @ApiProperty({ example: 'uuid-...' })
  userId!: string;

  @ApiProperty({ example: 'avatar-uuid-...' })
  avatarId!: string;

  @ApiProperty({ example: 175.5 })
  heightCm!: number;

  @ApiProperty({ example: 70.0 })
  weightKg!: number;

  @ApiProperty({ example: 22.86 })
  bmi!: number;

  @ApiProperty({ example: 'neutral' })
  gender!: string;

  @ApiPropertyOptional({ example: 'medium' })
  skinTone!: string | null;

  @ApiPropertyOptional({ example: 'dark_brown' })
  hairColor!: string | null;

  @ApiProperty({ example: 'meshes/user/avatar.glb' })
  meshReference!: string;

  @ApiPropertyOptional({ example: 'Mon avatar de juin 2026' })
  label!: string | null;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  createdAt!: Date;
}
