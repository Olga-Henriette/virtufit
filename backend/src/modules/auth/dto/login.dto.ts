import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@exemple.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'MotDePasse123' })
  @IsString()
  @MinLength(8)
  password!: string;
}
