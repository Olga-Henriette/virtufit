import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface AvatarDocument extends Avatar, Document {
  created_at: Date;
  updated_at: Date;
}

@Schema({
  collection: 'avatars',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false,
})
export class Avatar {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, unique: true })
  avatarId!: string;

  // Paramètres SMPL
  @Prop({ type: [Number], required: true })
  smplBetas!: number[];

  @Prop({ type: [Number], required: true })
  smplThetas!: number[];

  // Métadonnées du maillage
  @Prop({ required: true })
  meshReference!: string;

  @Prop({ default: 'gltf' })
  meshFormat!: string;

  @Prop({ type: Number, required: true })
  verticesCount!: number;

  @Prop({ type: Number, required: true })
  facesCount!: number;

  // Données morphologiques
  @Prop({ type: Number, required: true })
  heightCm!: number;

  @Prop({ type: Number, required: true })
  weightKg!: number;

  @Prop({ type: Number, required: true })
  bmi!: number;

  @Prop({ default: 'neutral', enum: ['male', 'female', 'neutral'] })
  gender!: string;

  // État
  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Number })
  generationTimeMs!: number;
}

export const AvatarSchema = SchemaFactory.createForClass(Avatar);

// Index composé pour requêtes fréquentes
AvatarSchema.index({ userId: 1, isActive: 1 });
