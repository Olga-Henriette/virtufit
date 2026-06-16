import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Détermine le statut
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Une erreur interne est survenue.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp['message'] as string | string[]) ?? exception.message;
      }
    } else if (exception instanceof Error) {
      // Erreurs non-HTTP (ex: erreurs TypeORM, Mongoose)
      this.logger.error(
        `Erreur non-HTTP : ${exception.message}`,
        exception.stack,
      );
      message = 'Erreur interne du serveur.';
    }

    // Log
    const currentStatus = Number(status);
    const logLevel =
      currentStatus >= 500 ? 'error' : currentStatus >= 400 ? 'warn' : 'log';

    this.logger[logLevel](
      `${request.method} ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Réponse standardisée
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
