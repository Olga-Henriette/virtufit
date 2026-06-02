import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  postgres: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    name: process.env.POSTGRES_DB ?? 'virtufit_db',
    user: process.env.POSTGRES_USER ?? 'virtufit_user',
    password: process.env.POSTGRES_PASSWORD ?? 'virtufit_password',
  },
  mongo: {
    uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/virtufit',
  },
}));
