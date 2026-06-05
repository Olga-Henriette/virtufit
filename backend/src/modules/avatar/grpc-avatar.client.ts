import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';

interface AvatarGrpcClient extends grpc.Client {
  GenerateAvatar(
    payload: Record<string, unknown>,
    callback: (error: grpc.ServiceError | null, response: unknown) => void,
  ): void;
}

@Injectable()
export class GrpcAvatarClient implements OnModuleInit {
  private readonly logger = new Logger(GrpcAvatarClient.name);
  private client: AvatarGrpcClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const host = this.configService.get<string>('grpc.aiHost', 'localhost');
    const port = this.configService.get<number>('grpc.aiPort', 50051);
    const addr = `${host}:${port}`;

    const protoPath = path.join(process.cwd(), 'src', 'proto', 'avatar.proto');

    const packageDef = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const proto: grpc.GrpcObject = grpc.loadPackageDefinition(packageDef);
    const virtufitPkg = proto.virtufit as grpc.GrpcObject;
    const avatarPkg = virtufitPkg.avatar as grpc.GrpcObject;
    const AvatarService =
      avatarPkg.AvatarService as unknown as grpc.ServiceClientConstructor;

    if (!AvatarService) {
      this.logger.warn(
        ' Service gRPC AvatarService introuvable dans le proto. ' +
          'Vérifiez le fichier avatar.proto.',
      );
      return;
    }

    this.client = new AvatarService(
      addr,
      grpc.credentials.createInsecure(),
    ) as unknown as AvatarGrpcClient;

    this.logger.log(` Client gRPC Avatar connecté sur ${addr}`);
  }

  // Générer un avatar via gRPC
  generateAvatar(payload: Record<string, unknown>): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Client gRPC non initialisé.'));
        return;
      }

      this.client.GenerateAvatar(
        payload,
        (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            this.logger.error(`gRPC GenerateAvatar error: ${error.message}`);
            reject(error);
          } else {
            resolve(response);
          }
        },
      );
    });
  }
}
