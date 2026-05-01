import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { resolve } from 'path';

loadEnv();

const rootDir = process.cwd();

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'laptop_shop',
  entities: [resolve(rootDir, 'src/modules/**/*.entity.ts')],
  migrations: [resolve(rootDir, 'src/database/migrations/*.ts')],
});
