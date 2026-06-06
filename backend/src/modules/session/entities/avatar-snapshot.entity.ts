import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('avatar_snapshots')
@Index(['userId', 'createdAt'])
export class AvatarSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ name: 'avatar_id', type: 'varchar' })
  avatarId!: string;

  // Données morphologiques sauvegardées
  @Column({ name: 'height_cm', type: 'decimal', precision: 5, scale: 2 })
  heightCm!: number;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 5, scale: 2 })
  weightKg!: number;

  @Column({ name: 'bmi', type: 'decimal', precision: 5, scale: 2 })
  bmi!: number;

  @Column({ name: 'gender', type: 'varchar', length: 10 })
  gender!: string;

  // Paramètres SMPL compressés
  @Column({ name: 'smpl_betas', type: 'jsonb' })
  smplBetas!: number[];

  // Personnalisation visuelle
  @Column({
    name: 'skin_tone',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  skinTone!: string | null;

  @Column({
    name: 'hair_color',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  hairColor!: string | null;

  // Référence MongoDB
  @Column({ name: 'mesh_reference', type: 'varchar' })
  meshReference!: string;

  // Label utilisateur
  @Column({
    name: 'label',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  label!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
