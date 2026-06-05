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

interface AvatarLoadPayload {
  userId: string;
  avatarId: string;
}

interface SimulationStartPayload {
  sessionId: string;
  userId: string;
  avatarId: string;
  clothingId: string;
}

@WebSocketGateway({
  namespace: '/unity',
  cors: { origin: '*' },
  transports: ['websocket'],
})
export class AvatarGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(AvatarGateway.name);

  // Cycle de vie
  afterInit(): void {
    this.logger.log('WebSocket Gateway /unity initialisé');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Unity client connecté    — id=${client.id}`);
    client.emit('connected', {
      message: 'VirtuFit WebSocket prêt',
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Unity client déconnecté — id=${client.id}`);
  }

  // Chargement d'avatar
  @SubscribeMessage('avatar:load')
  handleAvatarLoad(
    @MessageBody() payload: AvatarLoadPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    this.logger.log(
      `avatar:load — user=${payload.userId} avatar=${payload.avatarId}`,
    );

    // Émission de confirmation vers Unity
    client.emit('avatar:ready', {
      avatarId: payload.avatarId,
      status: 'loaded',
      timestamp: new Date().toISOString(),
    });
  }

  // Démarrage simulation
  @SubscribeMessage('simulation:start')
  async handleSimulationStart(
    @MessageBody() payload: SimulationStartPayload,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    this.logger.log(
      `simulation:start — session=${payload.sessionId} clothing=${payload.clothingId}`,
    );

    // Notification de démarrage
    client.emit('simulation:started', {
      sessionId: payload.sessionId,
      status: 'processing',
      timestamp: new Date().toISOString(),
    });

    // Simulation d'envoi de frames (sera remplacé par le vrai moteur)
    await this.streamSimulationFrames(client, payload.sessionId);
  }

  // Streaming de frames
  private async streamSimulationFrames(
    client: Socket,
    sessionId: string,
  ): Promise<void> {
    const totalFrames = 5;

    for (let frame = 1; frame <= totalFrames; frame++) {
      await new Promise<void>((r) => setTimeout(r, 200));

      client.emit('simulation:frame', {
        sessionId,
        frameNumber: frame,
        progress: frame / totalFrames,
        timestamp: new Date().toISOString(),
      });
    }

    // Notification de fin
    client.emit('simulation:completed', {
      sessionId,
      status: 'completed',
      fitScore: 85.5,
      timestamp: new Date().toISOString(),
    });
  }

  // Méthodes publiques pour les autres services
  notifyAvatarGenerated(userId: string, avatarId: string): void {
    this.server.emit('avatar:generated', {
      userId,
      avatarId,
      timestamp: new Date().toISOString(),
    });
  }

  notifyPersonalizationComplete(userId: string, avatarId: string): void {
    this.server.emit('avatar:personalized', {
      userId,
      avatarId,
      timestamp: new Date().toISOString(),
    });
  }
}
