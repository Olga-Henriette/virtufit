import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CatalogueService } from './catalogue.service';
import { ClothingResponseDto, DigitizeClothingDto } from './dto';
import { DigitizeClothingBodyDto } from './dto/digitize-request-body.dto';

@ApiTags('Catalogue')
@ApiBearerAuth()
@Controller('catalogue')
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  // Numériser
  @Post('digitize')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('photos', 5, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Numériser un vêtement depuis des photos' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        clothingId: { type: 'string', format: 'uuid' },
        vendorId: { type: 'string', format: 'uuid' },
        category: {
          type: 'string',
          enum: ['top', 'bottom', 'dress', 'outerwear', 'underwear'],
        },
        name: { type: 'string' },
        viewAngles: {
          type: 'string',
          description: 'JSON array ex: ["front","back"]',
        },
        photos: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiResponse({ status: 201, type: ClothingResponseDto })
  async digitize(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: DigitizeClothingBodyDto,
  ): Promise<ClothingResponseDto> {
    const dto: DigitizeClothingDto = {
      clothingId: body.clothingId,
      vendorId: body.vendorId,
      category: body.category,
      name: body.name,
    };

    let angles: string[];

    if (body.viewAngles) {
      try {
        angles = JSON.parse(body.viewAngles) as string[];
      } catch {
        angles = files.map(
          (_, i) => ['front', 'back', 'left', 'right', 'detail'][i] ?? 'detail',
        );
      }
    } else {
      angles = files.map(
        (_, i) => ['front', 'back', 'left', 'right', 'detail'][i] ?? 'detail',
      );
    }
    return this.catalogueService.digitize(dto, files, angles);
  }

  // Récupérer par ID
  @Get(':clothingId')
  @ApiOperation({ summary: 'Récupérer un vêtement par ID' })
  @ApiParam({ name: 'clothingId', type: 'string' })
  @ApiResponse({ status: 200, type: ClothingResponseDto })
  async findById(
    @Param('clothingId') clothingId: string,
  ): Promise<ClothingResponseDto> {
    return this.catalogueService.findById(clothingId);
  }

  // Lister par vendeur
  @Get('vendors/:vendorId')
  @ApiOperation({ summary: "Lister le catalogue d'un vendeur" })
  @ApiParam({ name: 'vendorId', format: 'uuid' })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, type: [ClothingResponseDto] })
  async findByVendor(
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
    @Query('category') category?: string,
  ): Promise<ClothingResponseDto[]> {
    return this.catalogueService.findByVendor(vendorId, category);
  }

  // Désactiver
  @Delete(':clothingId/vendors/:vendorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Désactiver un vêtement du catalogue' })
  @ApiParam({ name: 'clothingId', type: 'string' })
  @ApiParam({ name: 'vendorId', format: 'uuid' })
  @ApiResponse({ status: 204 })
  async deactivate(
    @Param('clothingId') clothingId: string,
    @Param('vendorId', ParseUUIDPipe) vendorId: string,
  ): Promise<void> {
    return this.catalogueService.deactivate(clothingId, vendorId);
  }
}
