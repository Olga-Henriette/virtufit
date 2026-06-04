import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MorphotypeCode {
  MALE_ECTOMORPH = 'male_ectomorph',
  MALE_MESOMORPH = 'male_mesomorph',
  MALE_ENDOMORPH = 'male_endomorph',
  FEMALE_HOURGLASS = 'female_hourglass',
  FEMALE_PEAR = 'female_pear',
  FEMALE_APPLE = 'female_apple',
  FEMALE_RECTANGLE = 'female_rectangle',
  NEUTRAL_AVERAGE = 'neutral_average',
  NEUTRAL_ATHLETIC = 'neutral_athletic',
}

export class SelectMorphotypeDto {
  @ApiProperty({ description: "UUID de l'utilisateur", format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    enum: MorphotypeCode,
    example: MorphotypeCode.NEUTRAL_AVERAGE,
    description: 'Code du morphotype sélectionné',
  })
  @IsEnum(MorphotypeCode)
  morphotypeCode!: MorphotypeCode;

  @ApiProperty({
    description: "Taille réelle de l'utilisateur en cm",
    example: 175.0,
    minimum: 50,
    maximum: 250,
  })
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsPositive()
  @Min(50)
  @Max(250)
  @Type(() => Number)
  targetHeightCm!: number;

  @ApiProperty({
    description: "Poids réel de l'utilisateur en kg",
    example: 70.0,
    minimum: 20,
    maximum: 300,
  })
  @IsNumber({ maxDecimalPlaces: 1 })
  @IsPositive()
  @Min(20)
  @Max(300)
  @Type(() => Number)
  targetWeightKg!: number;
}
