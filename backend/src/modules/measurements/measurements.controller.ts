import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MeasurementsService } from './measurements.service';
import {
  CreateMeasurementDto,
  MeasurementResponseDto,
  UpdateMeasurementDto,
} from './dto';

@ApiTags('Measurements')
@ApiBearerAuth()
@Controller('measurements')
export class MeasurementsController {
  constructor(private readonly measurementsService: MeasurementsService) {}

  @Post('users/:userId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Créer les mensurations d'un utilisateur" })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: MeasurementResponseDto })
  async create(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CreateMeasurementDto,
  ): Promise<MeasurementResponseDto> {
    return this.measurementsService.create(userId, dto);
  }

  @Get('users/:userId/active')
  @ApiOperation({
    summary: "Récupérer les mensurations actives d'un utilisateur",
  })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: MeasurementResponseDto })
  async findActive(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<MeasurementResponseDto> {
    return this.measurementsService.findActiveByUserId(userId);
  }

  @Get('users/:userId/history')
  @ApiOperation({ summary: "Récupérer l'historique des mensurations" })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: [MeasurementResponseDto] })
  async findHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<MeasurementResponseDto[]> {
    return this.measurementsService.findAllByUserId(userId);
  }

  @Put(':id/users/:userId')
  @ApiOperation({ summary: 'Mettre à jour des mensurations' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: MeasurementResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateMeasurementDto,
  ): Promise<MeasurementResponseDto> {
    return this.measurementsService.update(id, userId, dto);
  }

  @Delete(':id/users/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Désactiver des mensurations' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204 })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.measurementsService.deactivate(id, userId);
  }
}
