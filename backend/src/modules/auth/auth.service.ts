import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './entities/user.entity';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Inscription
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = this.userRepo.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role: dto.role,
    });

    const saved = await this.userRepo.save(user);
    this.logger.log(`Nouveau compte créé — email=${saved.email}`);

    return this._buildAuthResponse(saved);
  }

  // Connexion
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    return this._buildAuthResponse(user);
  }

  // Déconnexion
  async logout(userId: string): Promise<void> {
    await this.userRepo.update(userId, { refreshTokenHash: null });
  }

  // Rafraîchissement du token
  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');

    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré.');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Session invalide.');
    }

    const tokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );
    if (!tokenValid) {
      throw new UnauthorizedException('Refresh token invalide.');
    }

    return this._buildAuthResponse(user);
  }

  // Profil
  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable.');
    }
    return user;
  }

  // Utilitaires privés

  private async _buildAuthResponse(user: User): Promise<AuthResponseDto> {
    const accessToken = this._signAccessToken(user);
    const refreshToken = this._signRefreshToken(user);

    const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    await this.userRepo.update(user.id, { refreshTokenHash });

    return {
      accessToken,
      refreshToken,
      user: {
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

  private _signAccessToken(user: User): string {
    const secret =
      this.configService.get<string>('jwt.accessSecret') ?? 'fallback_secret';
    const expiresIn =
      this.configService.get<string>('jwt.accessExpiresIn') ?? '15m';

    return this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret,
        expiresIn: expiresIn as unknown as number,
      },
    );
  }

  private _signRefreshToken(user: User): string {
    const secret =
      this.configService.get<string>('jwt.refreshSecret') ??
      'fallback_refresh_secret';
    const expiresIn =
      this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';

    return this.jwtService.sign(
      { sub: user.id },
      {
        secret,
        expiresIn: expiresIn as unknown as number,
      },
    );
  }
}
