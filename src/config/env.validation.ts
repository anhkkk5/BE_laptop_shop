import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  PORT: number = 3100;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @IsString()
  FRONTEND_URL!: string;

  // Database
  @IsString()
  DB_HOST!: string;

  @IsNumber()
  DB_PORT: number = 3306;

  @IsString()
  DB_USERNAME!: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD: string = '';

  @IsString()
  DB_NAME!: string;

  // Redis
  @IsString()
  REDIS_HOST!: string;

  @IsNumber()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_USERNAME: string = 'default';

  @IsString()
  @IsOptional()
  REDIS_PASSWORD: string = '';

  // JWT
  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET!: string;

  @IsNumber()
  @IsOptional()
  REFRESH_TOKEN_TTL_SECONDS: number = 604800;

  @IsNumber()
  @IsOptional()
  BCRYPT_SALT_ROUNDS: number = 10;

  // Google OAuth
  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID: string = '';

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET: string = '';

  @IsString()
  @IsOptional()
  GOOGLE_CALLBACK_URL: string = '';

  // Email
  @IsString()
  @IsOptional()
  SMTP_HOST: string = '';

  @IsNumber()
  @IsOptional()
  SMTP_PORT: number = 587;

  @IsString()
  @IsOptional()
  SMTP_USER: string = '';

  @IsString()
  @IsOptional()
  SMTP_PASS: string = '';

  @IsString()
  @IsOptional()
  EMAIL_FROM: string = '';

  @IsString()
  @IsOptional()
  EMAIL_FROM_NAME: string = '';

  // Cloudinary
  @IsString()
  @IsOptional()
  CLOUDINARY_CLOUD_NAME: string = '';

  @IsString()
  @IsOptional()
  CLOUDINARY_API_KEY: string = '';

  @IsString()
  @IsOptional()
  CLOUDINARY_API_SECRET: string = '';

  // Admin seed
  @IsString()
  @IsOptional()
  ADMIN_EMAIL: string = 'admin@example.com';

  @IsString()
  @IsOptional()
  ADMIN_PASSWORD: string = '';

  @IsString()
  @IsOptional()
  ADMIN_NAME: string = 'Admin';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
