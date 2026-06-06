import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SessionStatus {
  INITIATED = 'initiated',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum AnimationType {
  STANDING = 'standing',
  WALKING = 'walking',
  ROTATING = 'rotating',
}

@Entity('try_on_sessions')
@Index(['userId', 'status'])
@Index(['userId', 'createdAt'])
export class TryOnSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ name: 'avatar_id', type: 'varchar' })
  avatarId!: string;

  @Column({ name: 'clothing_id', type: 'uuid' })
  clothingId!: string;

  // État de la session
  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.INITIATED,
  })
  status!: SessionStatus;

  @Column({
    name: 'animation_type',
    type: 'enum',
    enum: AnimationType,
    default: AnimationType.STANDING,
  })
  animationType!: AnimationType;

  // Résultats de simulation
  @Column({
    name: 'fit_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  fitScore!: number | null;

  @Column({
    name: 'overall_fit',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  overallFit!: string | null;

  @Column({
    name: 'simulation_result',
    type: 'jsonb',
    nullable: true,
  })
  simulationResult!: Record<string, unknown> | null;

  @Column({
    name: 'tension_zones',
    type: 'jsonb',
    nullable: true,
  })
  tensionZones!: Record<string, unknown>[] | null;

  // Performance
  @Column({
    name: 'simulation_ms',
    type: 'integer',
    nullable: true,
  })
  simulationMs!: number | null;

  @Column({
    name: 'error_message',
    type: 'text',
    nullable: true,
  })
  errorMessage!: string | null;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({
    name: 'completed_at',
    type: 'timestamptz',
    nullable: true,
  })
  completedAt!: Date | null;
}
