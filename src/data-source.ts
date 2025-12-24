import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',

  host: process.env.DB_MIGRATION_HOST,
  port: Number(process.env.DB_MIGRATION_PORT || 5432),
  username: process.env.DB_MIGRATION_USER,
  password: process.env.DB_MIGRATION_PASS,
  database: process.env.DB_MIGRATION_NAME,

  ssl: {
    rejectUnauthorized: false,
  },

  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
