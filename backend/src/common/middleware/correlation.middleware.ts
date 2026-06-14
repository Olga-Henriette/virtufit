import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? randomUUID();
    const startTime = Date.now();

    // Injecte dans la requête et la réponse
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 400 ? 'warn' : 'log';

      this.logger[level](
        `${req.method} ${req.originalUrl} → ${res.statusCode} [${duration}ms] ` +
          `corr=${correlationId.slice(0, 8)}`,
      );
    });

    next();
  }
}
