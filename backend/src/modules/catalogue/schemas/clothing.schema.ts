import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClothingDocument = Clothing & Document;
export interface ColorInfo {
  dominantRgb: number[];
  palette: number[][];
  isPatterned: boolean;
  patternType: string | null;
}

export interface ContourInfo {
  boundingWidthPx: number;
  boundingHeightPx: number;
  contourAreaPx: number;
  aspectRatio: number;
  symmetryScore: number;
}

@Schema({
  collection: 'clothings',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false,
})
export class Clothing {
  // Identifiants
  @Prop({ required: true, unique: true, index: true })
  clothingId!: string;

  @Prop({ required: true, index: true })
  vendorId!: string;

  // Informations produit
  @Prop({ required: true })
  name!: string;

  @Prop({
    required: true,
    enum: ['top', 'bottom', 'dress', 'outerwear', 'underwear'],
  })
  category!: string;

  @Prop({
    default: 'unknown',
    enum: ['cotton', 'denim', 'wool', 'silk', 'polyester', 'linen', 'unknown'],
  })
  fabricType!: string;

  @Prop({ default: 'M' })
  estimatedSize!: string;

  // Données de numérisation
  @Prop({ type: Object })
  colorInfo!: ColorInfo;

  @Prop({ type: Object })
  contourInfo!: ContourInfo;

  // Propriétés physiques (textile)
  @Prop({ type: Number, default: 0.3 })
  elasticityCoeff!: number;

  @Prop({ type: Number, default: 0.5 })
  frictionCoeff!: number;

  @Prop({ type: Number, default: 150 })
  weightPerSqm!: number;

  // Références 3D
  @Prop({
    type: String,
    default: null,
  })
  meshReference!: string | null;

  @Prop({
    type: String,
    default: null,
  })
  textureReference!: string | null;

  // Photos sources
  @Prop({ type: [String], default: [] })
  photoReferences!: string[];

  @Prop({ type: Number, default: 0 })
  digitizationMs!: number;

  // État
  @Prop({ default: true, index: true })
  isActive!: boolean;

  @Prop({ default: false })
  isDigitized!: boolean;

  created_at?: Date;
  updated_at?: Date;
}

export const ClothingSchema = SchemaFactory.createForClass(Clothing);
ClothingSchema.index({ vendorId: 1, isActive: 1 });
ClothingSchema.index({ category: 1, isActive: 1 });
