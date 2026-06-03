import { ApiProperty } from '@nestjs/swagger';

export class SmplParametersDto {
  @ApiProperty({ type: [Number], description: '10 paramètres de forme SMPL' })
  betas!: number[];

  @ApiProperty({ type: [Number], description: '72 paramètres de pose SMPL' })
  thetas!: number[];
}

export class AvatarMeshDto {
  @ApiProperty({ example: 6890 })
  verticesCount!: number;

  @ApiProperty({ example: 13776 })
  facesCount!: number;

  @ApiProperty({ example: 'gltf' })
  meshFormat!: string;

  @ApiProperty({ example: 'meshes/user-uuid/avatar-uuid.glb' })
  meshReference!: string;
}

export class AvatarResponseDto {
  @ApiProperty({ example: 'uuid-...' })
  avatarId!: string;

  @ApiProperty({ example: 'uuid-...' })
  userId!: string;

  @ApiProperty({ type: SmplParametersDto })
  smplParameters!: SmplParametersDto;

  @ApiProperty({ type: AvatarMeshDto })
  mesh!: AvatarMeshDto;

  @ApiProperty({ example: 22.86 })
  bmi!: number;

  @ApiProperty({ example: 'neutral', enum: ['male', 'female', 'neutral'] })
  gender!: string;

  @ApiProperty({ example: 175.5 })
  heightCm!: number;

  @ApiProperty({ example: 70.0 })
  weightKg!: number;

  @ApiProperty({ example: 142.5 })
  generationTimeMs!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-06-03T00:00:00.000Z' })
  createdAt!: Date;
}
