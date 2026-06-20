import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'user@exemple.com' })
  @IsEmail({}, { message: "L'email doit être valide." })
  email!: string;

  @ApiProperty({ example: 'MotDePasse123' })
  @IsString()
  @MinLength(8, { message: '8 caractères minimum.' })
  @Matches(/(?=.*[A-Z])/, { message: 'Au moins une majuscule.' })
  @Matches(/(?=.*[0-9])/, { message: 'Au moins un chiffre.' })
  password!: string;

  @ApiProperty({ example: 'Olga' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({ example: 'Henriette' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CLIENT })
  @IsEnum(UserRole, { message: 'Rôle invalide.' })
  role!: UserRole;
}
