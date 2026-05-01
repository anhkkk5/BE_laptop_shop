import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import {
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  mailConfig,
  validate,
} from './config/index.js';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { CategoryModule } from './modules/category/category.module.js';
import { BrandModule } from './modules/brand/brand.module.js';
import { ProductModule } from './modules/product/product.module.js';
import { CartModule } from './modules/cart/cart.module.js';
import { OrderModule } from './modules/order/order.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { PcBuildModule } from './modules/pc-build/pc-build.module.js';
import { WarrantyModule } from './modules/warranty/warranty.module.js';
import { AdminSeed } from './database/seeds/admin.seed.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, mailConfig],
      validate,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: config.get<string>('app.nodeEnv') === 'development',
        logging: config.get<string>('app.nodeEnv') === 'development',
      }),
    }),

    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single' as const,
        url: `redis://${config.get<string>('redis.username', 'default')}:${config.get<string>('redis.password')}@${config.get<string>('redis.host')}:${config.get<number>('redis.port')}`,
      }),
    }),

    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 60 }],
    }),

    EventEmitterModule.forRoot(),

    AuthModule,
    UserModule,
    CategoryModule,
    BrandModule,
    ProductModule,
    CartModule,
    OrderModule,
    PaymentModule,
    PcBuildModule,
    WarrantyModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    AdminSeed,
  ],
})
export class AppModule {}
