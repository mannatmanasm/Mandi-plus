import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_MIGRATION_HOST,
  port: Number(process.env.DB_MIGRATION_PORT),
  username: process.env.DB_MIGRATION_USER,
  password: process.env.DB_MIGRATION_PASS,
  database: process.env.DB_MIGRATION_NAME,

  ssl: {
    rejectUnauthorized: false,
  },

  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
