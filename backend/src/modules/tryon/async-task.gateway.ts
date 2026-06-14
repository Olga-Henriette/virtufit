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

interface TaskSubscribePayload {
  taskId: string;
  userId: string;
}

interface TaskProgressPayload {
  taskId: string;
  status: string;
  progress: number;
  result?: Record<string, unknown>;
  error?: string;
}

interface ApiResponseStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}

@WebSocketGateway({
  namespace: '/async-tasks',
  cors: { origin: '*' },
  transports: ['websocket'],
})
export class AsyncTaskGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(AsyncTaskGateway.name);

  // Map task_id → Set<socket_id>
  private readonly taskSubscribers = new Map<string, Set<string>>();
  private readonly clientTasks = new Map<string, Set<string>>();

  afterInit(): void {
    this.logger.log(' WebSocket Gateway /async-tasks initialisé');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connecté — id=${client.id}`);
    this.clientTasks.set(client.id, new Set());
    client.emit('tasks:connected', {
      message: 'VirtuFit Async Tasks prêt',
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client déconnecté — id=${client.id}`);

    // Nettoie les abonnements du client
    const tasks = this.clientTasks.get(client.id) ?? new Set();
    for (const taskId of tasks) {
      const subs = this.taskSubscribers.get(taskId);
      if (subs) {
        subs.delete(client.id);
        if (subs.size === 0) {
          this.taskSubscribers.delete(taskId);
        }
      }
    }
    this.clientTasks.delete(client.id);
  }

  // Abonnement à une tâche
  @SubscribeMessage('task:subscribe')
  handleSubscribe(
    @MessageBody() payload: TaskSubscribePayload,
    @ConnectedSocket() client: Socket,
  ): void {
    const { taskId } = payload;
    this.logger.log(`task:subscribe — taskId=${taskId} client=${client.id}`);

    if (!this.taskSubscribers.has(taskId)) {
      this.taskSubscribers.set(taskId, new Set());
    }
    this.taskSubscribers.get(taskId)!.add(client.id);
    this.clientTasks.get(client.id)?.add(taskId);

    client.emit('task:subscribed', {
      taskId,
      timestamp: new Date().toISOString(),
    });

    // Démarre le polling de statut
    this._startPolling(taskId, client);
  }

  // Désabonnement
  @SubscribeMessage('task:unsubscribe')
  handleUnsubscribe(
    @MessageBody() payload: { taskId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const { taskId } = payload;
    this.taskSubscribers.get(taskId)?.delete(client.id);
    this.clientTasks.get(client.id)?.delete(taskId);

    client.emit('task:unsubscribed', { taskId });
  }

  // Méthodes publiques
  notifyTaskProgress(payload: TaskProgressPayload): void {
    const subs = this.taskSubscribers.get(payload.taskId);
    if (!subs?.size) return;

    this.server.to([...subs]).emit('task:progress', {
      ...payload,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(
      `task:progress — taskId=${payload.taskId} status=${payload.status}`,
    );
  }

  notifyTaskCompleted(taskId: string, result: Record<string, unknown>): void {
    const subs = this.taskSubscribers.get(taskId);
    if (!subs?.size) return;

    this.server.to([...subs]).emit('task:completed', {
      taskId,
      result,
      timestamp: new Date().toISOString(),
    });

    // Nettoie les abonnements
    this.taskSubscribers.delete(taskId);
    this.logger.log(`task:completed broadcast — taskId=${taskId}`);
  }

  notifyTaskFailed(taskId: string, error: string): void {
    const subs = this.taskSubscribers.get(taskId);
    if (!subs?.size) return;

    this.server.to([...subs]).emit('task:failed', {
      taskId,
      error,
      timestamp: new Date().toISOString(),
    });

    this.taskSubscribers.delete(taskId);
  }

  // Polling de statut
  private _startPolling(taskId: string, client: Socket): void {
    const aiServiceUrl = 'http://localhost:8000';
    const intervalMs = 500;
    const maxAttempts = 120; // 60 sec max
    let attempts = 0;

    const poll = (): void => {
      if (!client.connected) return;
      if (!this.taskSubscribers.get(taskId)?.has(client.id)) return;

      attempts++;
      if (attempts > maxAttempts) {
        client.emit('task:timeout', {
          taskId,
          message: 'Timeout dépassé — la tâche prend trop de temps.',
        });
        return;
      }

      void fetch(`${aiServiceUrl}/api/v1/tasks/${taskId}/status`)
        .then(async (response) => {
          if (!response.ok) {
            setTimeout(poll, intervalMs);
            return;
          }

          const statusData = (await response.json()) as ApiResponseStatus;

          client.emit('task:progress', {
            taskId,
            status: statusData.status,
            progress: statusData.progress ?? 0,
            timestamp: new Date().toISOString(),
          });

          if (statusData.status === 'completed') {
            const resResponse = await fetch(
              `${aiServiceUrl}/api/v1/tasks/${taskId}/result`,
            );
            if (resResponse.ok) {
              const result = (await resResponse.json()) as Record<
                string,
                unknown
              >;
              this.notifyTaskCompleted(taskId, result);
            }
            return;
          }

          if (statusData.status === 'failed') {
            this.notifyTaskFailed(
              taskId,
              statusData.error ?? 'Erreur inconnue',
            );
            return;
          }

          // Continue le polling
          setTimeout(poll, intervalMs);
        })
        .catch(() => {
          setTimeout(poll, intervalMs * 2);
        });
    };

    setTimeout(poll, intervalMs);
  }
}
