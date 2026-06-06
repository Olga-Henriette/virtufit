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
import { SessionService } from './session.service';
import {
  CreateSessionDto,
  SessionResponseDto,
  SnapshotResponseDto,
} from './dto';

@ApiTags('Sessions & Persistence')
@ApiBearerAuth()
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  // Sessions d'essayage

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Créer une session d'essayage" })
  @ApiResponse({ status: 201, type: SessionResponseDto })
  async createSession(
    @Body() dto: CreateSessionDto,
  ): Promise<SessionResponseDto> {
    return this.sessionService.createSession(dto);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Récupérer une session par ID' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 200, type: SessionResponseDto })
  async findSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionResponseDto> {
    return this.sessionService.findSessionById(sessionId);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: "Historique des sessions d'un utilisateur" })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: [SessionResponseDto] })
  async findUserSessions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<SessionResponseDto[]> {
    return this.sessionService.findSessionsByUser(userId, limit);
  }

  @Get('users/:userId/stats')
  @ApiOperation({ summary: "Statistiques d'essayage d'un utilisateur" })
  @ApiParam({ name: 'userId', format: 'uuid' })
  async getUserStats(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<Record<string, unknown>> {
    return this.sessionService.getUserStats(userId);
  }

  // Snapshots d'avatar

  @Post('users/:userId/snapshots')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Sauvegarder un snapshot de l'avatar actif" })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiQuery({ name: 'label', required: false, type: String })
  @ApiResponse({ status: 201, type: SnapshotResponseDto })
  async createSnapshot(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('label') label?: string,
  ): Promise<SnapshotResponseDto> {
    return this.sessionService.createSnapshotFromActiveAvatar(userId, label);
  }

  @Get('users/:userId/snapshots')
  @ApiOperation({ summary: "Lister les snapshots d'un utilisateur" })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiResponse({ status: 200, type: [SnapshotResponseDto] })
  async findSnapshots(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<SnapshotResponseDto[]> {
    return this.sessionService.findSnapshotsByUser(userId);
  }

  @Post('users/:userId/snapshots/:snapshotId/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restaurer un avatar depuis un snapshot' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiParam({ name: 'snapshotId', format: 'uuid' })
  @ApiResponse({ status: 200, type: SnapshotResponseDto })
  async restoreSnapshot(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('snapshotId', ParseUUIDPipe) snapshotId: string,
  ): Promise<SnapshotResponseDto> {
    return this.sessionService.restoreSnapshot(snapshotId, userId);
  }
}
