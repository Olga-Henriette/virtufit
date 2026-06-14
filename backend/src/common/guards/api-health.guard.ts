import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard qui vérifie que l'application est en état opérationnel.
 * Peut être utilisé pour bloquer les requêtes lors d'un démarrage.
 */
@Injectable()
export class ApiHealthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(): boolean {
    const env = this.configService.get<string>('app.nodeEnv', 'development');
    if (env === 'maintenance') {
      throw new ServiceUnavailableException(
        'Le service est temporairement en maintenance.',
      );
    }
    return true;
  }
}
