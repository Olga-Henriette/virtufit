import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AvatarService } from './avatar.service';
import {
  GenerateAvatarDto,
  AvatarResponseDto,
  SelectMorphotypeDto,
} from './dto';

@ApiTags('Avatars')
@ApiBearerAuth()
@Controller('avatars')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Générer un avatar 3D à partir des mensurations' })
  @ApiResponse({ status: 201, type: AvatarResponseDto })
  @ApiResponse({ status: 503, description: 'AI Service indisponible' })
  async generate(@Body() dto: GenerateAvatarDto): Promise<AvatarResponseDto> {
    return this.avatarService.generate(dto);
  }

  @Get('users/:userId/active')
  @ApiOperation({ summary: "Récupérer l'avatar actif d'un utilisateur" })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: AvatarResponseDto })
  async findActive(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<AvatarResponseDto> {
    return this.avatarService.findActiveByUserId(userId);
  }

  @Get('users/:userId/history')
  @ApiOperation({ summary: "Récupérer l'historique des avatars" })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, type: [AvatarResponseDto] })
  async findHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<AvatarResponseDto[]> {
    return this.avatarService.findAllByUserId(userId);
  }

  @Post('morphotype')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Générer un avatar depuis un morphotype prédéfini' })
  @ApiResponse({ status: 201, type: AvatarResponseDto })
  async generateFromMorphotype(
    @Body() dto: SelectMorphotypeDto,
  ): Promise<AvatarResponseDto> {
    return this.avatarService.generateFromMorphotype(dto);
  }
}
