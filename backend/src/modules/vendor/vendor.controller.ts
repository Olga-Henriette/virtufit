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
import { VendorService } from './vendor.service';
import { ClothingDetailReportDto, VendorDashboardDto } from './dto';

@ApiTags('Vendor Dashboard')
@ApiBearerAuth()
@Controller('vendor')
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  // Dashboard principal
  @Get(':vendorId/dashboard')
  @ApiOperation({
    summary: 'Dashboard complet du vendeur',
    description:
      'Retourne les analytics complets : performances du catalogue, ' +
      'zones de tension, distribution des tailles et recommandations.',
  })
  @ApiParam({ name: 'vendorId', format: 'uuid' })
  @ApiQuery({
    name: 'periodDays',
    required: false,
    type: Number,
    example: 30,
    description: "Période d'analyse en jours (défaut: 30)",
  })
  @ApiResponse({ status: 200, type: VendorDashboardDto })
  async getDashboard(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('periodDays', new ParseIntPipe({ optional: true }))
    periodDays?: number,
  ): Promise<VendorDashboardDto> {
    return this.vendorService.getDashboard(vendorId, periodDays ?? 30);
  }

  // Rapport par vêtement
  @Get(':vendorId/clothing/:clothingId/report')
  @ApiOperation({
    summary: "Rapport détaillé d'un vêtement",
  })
  @ApiParam({ name: 'vendorId', format: 'uuid' })
  @ApiParam({ name: 'clothingId', type: 'string' })
  @ApiResponse({ status: 200, type: ClothingDetailReportDto })
  async getClothingReport(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Param('clothingId') clothingId: string,
  ): Promise<ClothingDetailReportDto> {
    return this.vendorService.getClothingReport(vendorId, clothingId);
  }

  // Analytics des sessions
  @Get(':vendorId/analytics')
  @ApiOperation({
    summary: "Analytics des sessions d'essayage",
  })
  @ApiParam({ name: 'vendorId', format: 'uuid' })
  @ApiQuery({ name: 'periodDays', required: false, type: Number, example: 30 })
  @ApiResponse({ status: 200 })
  async getSessionAnalytics(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('periodDays', new ParseIntPipe({ optional: true }))
    periodDays?: number,
  ): Promise<Record<string, unknown>> {
    return this.vendorService.getSessionAnalytics(vendorId, periodDays ?? 30);
  }
}
