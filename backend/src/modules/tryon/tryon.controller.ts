import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TryOnService } from './tryon.service';
import { StartTryOnDto, TryOnResponseDto } from './dto';

@ApiTags('Virtual Try-On')
@ApiBearerAuth()
@Controller('tryon')
export class TryOnController {
  constructor(private readonly tryOnService: TryOnService) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Démarrer un essayage virtuel',
    description:
      'Lance le pipeline complet : chargement avatar + vêtement, ' +
      "simulation physique, analyse d'ajustement, sauvegarde session.",
  })
  @ApiResponse({ status: 201, type: TryOnResponseDto })
  @ApiResponse({ status: 404, description: 'Avatar ou vêtement introuvable' })
  @ApiResponse({ status: 503, description: 'AI Service indisponible' })
  async startTryOn(@Body() dto: StartTryOnDto): Promise<TryOnResponseDto> {
    return this.tryOnService.startTryOn(dto);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: "Récupérer les résultats d'une session" })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 200, type: TryOnResponseDto })
  async findSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<TryOnResponseDto> {
    return this.tryOnService.findSession(sessionId);
  }

  @Get('users/:userId/history')
  @ApiOperation({ summary: "Historique des essayages d'un utilisateur" })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: [TryOnResponseDto] })
  async findHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<TryOnResponseDto[]> {
    return this.tryOnService.findUserHistory(userId, limit);
  }
}
