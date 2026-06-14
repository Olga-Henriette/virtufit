import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
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
import { AnalyticsService } from './analytics.service';
import {
  ExportResponseDto,
  PlatformAnalyticsDto,
  TimePeriod,
  UserFitProfileDto,
} from './dto';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Profil utilisateur
  @Get('users/:userId/profile')
  @ApiOperation({
    summary: "Profil d'ajustement d'un utilisateur",
    description:
      'Retourne les tendances, préférences et historique ' +
      "d'ajustement d'un utilisateur.",
  })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiResponse({ status: 200, type: UserFitProfileDto })
  async getUserProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserFitProfileDto> {
    return this.analyticsService.getUserFitProfile(userId);
  }

  // Analytics plateforme
  @Get('platform')
  @ApiOperation({
    summary: 'Analytics globaux de la plateforme',
    description:
      'Statistiques agrégées : essayages, scores, performance ' +
      'des simulations, répartition par catégorie et tissu.',
  })
  @ApiQuery({
    name: 'periodDays',
    required: false,
    type: Number,
    example: 30,
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: TimePeriod,
    example: TimePeriod.DAILY,
  })
  @ApiResponse({ status: 200, type: PlatformAnalyticsDto })
  async getPlatformAnalytics(
    @Query('periodDays', new ParseIntPipe({ optional: true }))
    periodDays?: number,
    @Query('period') period?: TimePeriod,
  ): Promise<PlatformAnalyticsDto> {
    return this.analyticsService.getPlatformAnalytics(
      periodDays ?? 30,
      period ?? TimePeriod.DAILY,
    );
  }

  // Export
  @Get('export')
  @ApiOperation({
    summary: 'Exporter les données de sessions',
    description: "Exporte les sessions d'essayage avec filtres optionnels.",
  })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'sinceDays', required: false, type: Number, example: 30 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 500 })
  @ApiResponse({ status: 200, type: ExportResponseDto })
  async exportData(
    @Query('userId') userId?: string,
    @Query('sinceDays', new ParseIntPipe({ optional: true }))
    sinceDays?: number,
    @Query('limit', new ParseIntPipe({ optional: true }))
    limit?: number,
  ): Promise<ExportResponseDto> {
    let since: Date | undefined;
    if (sinceDays) {
      since = new Date();
      since.setDate(since.getDate() - sinceDays);
    }

    return this.analyticsService.exportSessions({
      userId,
      since,
      limit: limit ?? 500,
    });
  }
}
