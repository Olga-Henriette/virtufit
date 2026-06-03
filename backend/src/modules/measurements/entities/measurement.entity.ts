import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('measurements')
export class Measurement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  // Mensurations principales
  @Column({ name: 'height_cm', type: 'decimal', precision: 5, scale: 2 })
  heightCm!: number;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 5, scale: 2 })
  weightKg!: number;

  // Circonférences (cm)
  @Column({ name: 'chest_cm', type: 'decimal', precision: 5, scale: 2 })
  chestCm!: number;

  @Column({ name: 'waist_cm', type: 'decimal', precision: 5, scale: 2 })
  waistCm!: number;

  @Column({ name: 'hips_cm', type: 'decimal', precision: 5, scale: 2 })
  hipsCm!: number;

  @Column({
    name: 'shoulder_width_cm',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  shoulderWidthCm!: number;

  @Column({
    name: 'inseam_cm',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  inseamCm!: number | null;

  @Column({
    name: 'neck_cm',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  neckCm!: number | null;

  @Column({
    name: 'arm_length_cm',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  armLengthCm!: number | null;

  @Column({
    name: 'thigh_cm',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  thighCm!: number | null;

  // Métadonnées
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
