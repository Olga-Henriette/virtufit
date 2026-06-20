import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret:
    process.env.JWT_ACCESS_SECRET ??
    process.env.JWT_SECRET ??
    'fallback_secret',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ??
    process.env.JWT_SECRET ??
    'fallback_refresh_secret',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
}));
