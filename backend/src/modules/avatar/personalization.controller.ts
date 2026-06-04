import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { PersonalizationService } from './personalization.service';
import { PersonalizationResponseDto } from './dto';

@ApiTags('Avatar Personalization')
@ApiBearerAuth()
@Controller('avatars/personalization')
export class PersonalizationController {
  constructor(
    private readonly personalizationService: PersonalizationService,
  ) {}

  @Post('users/:userId/photo')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`Format non supporté : ${file.mimetype}`), false);
        }
      },
    }),
  )
  @ApiOperation({
    summary: "Uploader une photo pour personnaliser l'avatar",
    description:
      'Analyse la photo pour extraire le ton de peau et la couleur ' +
      "de cheveux, puis met à jour l'avatar actif de l'utilisateur.",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Photo JPEG, PNG ou WebP — max 5 Mo',
        },
      },
    },
  })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: PersonalizationResponseDto })
  @ApiResponse({ status: 404, description: 'Aucun avatar actif trouvé' })
  @ApiResponse({ status: 400, description: 'Format de fichier non supporté' })
  async uploadPhoto(
    @Param('userId', ParseUUIDPipe) userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PersonalizationResponseDto> {
    return this.personalizationService.analyzeAndAttach(userId, file);
  }
}
