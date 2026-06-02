import { registerAs } from '@nestjs/config';

export const grpcConfig = registerAs('grpc', () => ({
  aiHost: process.env.GRPC_AI_HOST ?? 'localhost',
  aiPort: parseInt(process.env.GRPC_AI_PORT ?? '50051', 10),
}));
