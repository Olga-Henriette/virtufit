import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AvatarDocument = Avatar & Document;
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

  // Personnalisation visuelle
  @Prop({ type: String, required: false, default: null })
  photoReference!: string | null;

  @Prop({ type: String, required: false, default: null })
  skinTone!: string | null;

  @Prop({ type: String, required: false, default: null })
  hairColor!: string | null;

  @Prop({ type: [Number], required: false, default: null })
  skinRgb!: number[] | null;

  @Prop({ type: [Number], required: false, default: null })
  hairRgb!: number[] | null;

  created_at!: Date;
  updated_at!: Date;
}

export const AvatarSchema = SchemaFactory.createForClass(Avatar);

// Index composé pour requêtes fréquentes
AvatarSchema.index({ userId: 1, isActive: 1 });
