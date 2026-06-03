import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Health check du service Backend' })
  check(): Record<string, string> {
    return {
      status: 'ok',
      service: 'virtufit-backend',
      version: '1.0.0',
      environment: this.configService.get<string>('app.nodeEnv', 'development'),
      timestamp: new Date().toISOString(),
    };
  }
}
