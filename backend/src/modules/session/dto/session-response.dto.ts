import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SessionStatus,
  AnimationType,
} from '../entities/try-on-session.entity';

export class TensionZoneDto {
  @ApiProperty({ example: 'chest' })
  zoneName!: string;

  @ApiProperty({ example: 'medium', enum: ['low', 'medium', 'high'] })
  tensionLevel!: string;

  @ApiProperty({ example: 0.65 })
  tensionValue!: number;
}

export class SessionResponseDto {
  @ApiProperty({ example: 'uuid-...' })
  id!: string;

  @ApiProperty({ example: 'uuid-...' })
  userId!: string;

  @ApiProperty({ example: 'uuid-...' })
  avatarId!: string;

  @ApiProperty({ example: 'uuid-...' })
  clothingId!: string;

  @ApiProperty({ enum: SessionStatus, example: SessionStatus.COMPLETED })
  status!: SessionStatus;

  @ApiProperty({ enum: AnimationType, example: AnimationType.STANDING })
  animationType!: AnimationType;

  @ApiPropertyOptional({ example: 87.5 })
  fitScore!: number | null;

  @ApiPropertyOptional({ example: 'good', enum: ['tight', 'good', 'loose'] })
  overallFit!: string | null;

  @ApiPropertyOptional({ type: [TensionZoneDto] })
  tensionZones!: Record<string, unknown>[] | null;

  @ApiPropertyOptional({ example: 342 })
  simulationMs!: number | null;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2026-06-03T00:00:01.000Z' })
  completedAt!: Date | null;
}
