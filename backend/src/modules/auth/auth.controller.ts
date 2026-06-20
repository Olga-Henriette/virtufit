import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, AuthResponseDto } from './dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Créer un compte utilisateur' })
  async register(@Body() dto: RegisterDto): Promise<{ data: AuthResponseDto }> {
    const data = await this.authService.register(dto);
    return { data };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Se connecter' })
  async login(@Body() dto: LoginDto): Promise<{ data: AuthResponseDto }> {
    const data = await this.authService.login(dto);
    return { data };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: "Rafraîchir le token d'accès" })
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ data: AuthResponseDto }> {
    const data = await this.authService.refreshTokens(dto.refreshToken);
    return { data };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se déconnecter' })
  async logout(@CurrentUser() user: User): Promise<{ message: string }> {
    await this.authService.logout(user.id);
    return { message: 'Déconnecté avec succès.' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: "Profil de l'utilisateur connecté" })
  getProfile(@CurrentUser() user: User): { data: Record<string, unknown> } {
    return {
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    };
  }
}
