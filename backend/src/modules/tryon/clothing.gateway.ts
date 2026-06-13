import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

// Types des payloads WebSocket

interface SceneInitPayload {
  sessionId: string;
  avatarMeshRef: string;
  clothingMeshRef: string;
  animationType: string;
  frameCount: number;
  frameRate: number;
  smplBetas: number[];
  fabricType: string;
  fitScore: number;
}

interface FrameRequestPayload {
  sessionId: string;
  frameIndex: number;
}

interface StreamRequestPayload {
  sessionId: string;
  totalFrames: number;
  meshReference: string;
  fabricType: string;
  elasticityCoeff: number;
  frictionCoeff: number;
  animationType: string;
}

interface FitZonePayload {
  sessionId: string;
  zoneName: string;
  tensionLevel: string;
  tensionValue: number;
}

@WebSocketGateway({
  namespace: '/unity-clothing',
  cors: { origin: '*' },
  transports: ['websocket'],
})
export class ClothingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(ClothingGateway.name);

  // Cycle de vie
  afterInit(): void {
    this.logger.log('WebSocket Gateway /unity-clothing initialisé');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Unity client connecté    — id=${client.id}`);
    client.emit('clothing:connected', {
      message: 'VirtuFit Clothing Stream prêt',
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Unity client déconnecté — id=${client.id}`);
  }

  // Initialisation de scène
  @SubscribeMessage('scene:init')
  handleSceneInit(
    @MessageBody() payload: SceneInitPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    this.logger.log(
      `scene:init — session=${payload.sessionId} frames=${payload.frameCount}`,
    );

    // Confirme la configuration de scène à Unity
    client.emit('scene:ready', {
      sessionId: payload.sessionId,
      avatarMeshRef: payload.avatarMeshRef,
      clothingMeshRef: payload.clothingMeshRef,
      animationType: payload.animationType,
      frameCount: payload.frameCount,
      frameRate: payload.frameRate,
      fabricType: payload.fabricType,
      fitScore: payload.fitScore,
      timestamp: new Date().toISOString(),
    });
  }

  // Demande de frame spécifique
  @SubscribeMessage('frame:request')
  handleFrameRequest(
    @MessageBody() payload: FrameRequestPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    this.logger.debug(
      `frame:request — session=${payload.sessionId} index=${payload.frameIndex}`,
    );

    client.emit('frame:data', {
      sessionId: payload.sessionId,
      frameIndex: payload.frameIndex,
      vertexCount: 192, // GRID_ROWS * GRID_COLS
      energy: 0.0,
      encoding: 'uint16_quantized',
      timestamp: new Date().toISOString(),
    });
  }

  // Streaming complet
  @SubscribeMessage('stream:start')
  async handleStreamStart(
    @MessageBody() payload: StreamRequestPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    this.logger.log(
      `stream:start — session=${payload.sessionId} frames=${payload.totalFrames}`,
    );

    client.emit('stream:started', {
      sessionId: payload.sessionId,
      totalFrames: payload.totalFrames,
      timestamp: new Date().toISOString(),
    });

    await this._streamFrames(client, payload);
  }

  // Zones de tension (fit analysis)
  @SubscribeMessage('fit:zones-request')
  handleFitZonesRequest(
    @MessageBody() payload: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    this.logger.log(`fit:zones-request — session=${payload.sessionId}`);

    // Zones de tension prédéfinies
    const zones: FitZonePayload[] = [
      {
        sessionId: payload.sessionId,
        zoneName: 'shoulders',
        tensionLevel: 'low',
        tensionValue: 0.15,
      },
      {
        sessionId: payload.sessionId,
        zoneName: 'chest',
        tensionLevel: 'medium',
        tensionValue: 0.45,
      },
      {
        sessionId: payload.sessionId,
        zoneName: 'waist',
        tensionLevel: 'low',
        tensionValue: 0.2,
      },
      {
        sessionId: payload.sessionId,
        zoneName: 'hips',
        tensionLevel: 'low',
        tensionValue: 0.18,
      },
    ];

    client.emit('fit:zones-data', {
      sessionId: payload.sessionId,
      zones,
      timestamp: new Date().toISOString(),
    });
  }

  // Méthodes publiques pour les autres services

  broadcastSimulationReady(sessionId: string, fitScore: number): void {
    this.server.emit('simulation:ready', {
      sessionId,
      fitScore,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(
      `Broadcast simulation:ready — session=${sessionId} score=${fitScore}`,
    );
  }

  broadcastFitAnalysis(
    sessionId: string,
    overallFit: string,
    fitScore: number,
    tensionZones: FitZonePayload[],
    recommendations: string[],
  ): void {
    this.server.emit('fit:analysis', {
      sessionId,
      overallFit,
      fitScore,
      tensionZones,
      recommendations,
      timestamp: new Date().toISOString(),
    });
  }

  // Streaming interne

  private async _streamFrames(
    client: Socket,
    payload: StreamRequestPayload,
  ): Promise<void> {
    const { sessionId, totalFrames } = payload;
    const FRAME_DELAY_MS = Math.floor(1000 / 60); // 60 FPS

    for (let i = 0; i < totalFrames; i++) {
      if (!client.connected) {
        this.logger.warn(
          `Client déconnecté pendant le streaming — session=${sessionId} frame=${i}`,
        );
        break;
      }

      await new Promise<void>((r) => setTimeout(r, FRAME_DELAY_MS));

      client.emit('frame:data', {
        sessionId,
        frameIndex: i,
        vertexCount: 192,
        energy: Math.max(0, 0.05 * Math.exp(-i * 0.15)),
        progress: (i + 1) / totalFrames,
        encoding: 'uint16_quantized',
        timestamp: new Date().toISOString(),
      });
    }

    // Fin du stream
    client.emit('stream:completed', {
      sessionId,
      framesDelivered: totalFrames,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Stream terminé — session=${sessionId} frames=${totalFrames}`,
    );
  }
}
