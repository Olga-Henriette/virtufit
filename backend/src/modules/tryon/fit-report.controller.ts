import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FitReportService } from './fit-report.service';
import { FitReportDto } from './dto';

class CompareSizesDto {
  @ApiProperty({ type: [String], example: ['S', 'M', 'L'] })
  @IsArray()
  @IsString({ each: true })
  sizes!: string[];
}

@ApiTags('Fit Analysis Report')
@ApiBearerAuth()
@Controller('fit-report')
export class FitReportController {
  constructor(private readonly fitReportService: FitReportService) {}

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: "Générer le rapport d'ajustement détaillé" })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiResponse({ status: 200, type: FitReportDto })
  async generateReport(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<FitReportDto> {
    return this.fitReportService.generateReport(sessionId);
  }

  @Post('sessions/:sessionId/compare-sizes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Comparer plusieurs tailles pour une session' })
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiBody({ type: CompareSizesDto })
  @ApiResponse({ status: 200, description: 'Rapports par taille' })
  async compareSizes(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: CompareSizesDto,
  ): Promise<Record<string, FitReportDto>> {
    return this.fitReportService.compareSizes(sessionId, body.sizes);
  }
}
