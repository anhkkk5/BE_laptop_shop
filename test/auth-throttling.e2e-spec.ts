import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from '../src/modules/auth/controllers/client/auth.controller';
import { AuthService } from '../src/modules/auth/services/auth.service';
import { LocalAuthGuard } from '../src/modules/auth/guards/local-auth.guard';

describe('Auth throttling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const authServiceMock = {
      register: jest.fn().mockResolvedValue({
        user: { id: 1, email: 'user@example.com' },
        tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' },
      }),
      login: jest.fn().mockResolvedValue({
        user: { id: 1, email: 'user@example.com' },
        tokens: { accessToken: 'access-token', refreshToken: 'refresh-token' },
      }),
      forgotPassword: jest
        .fn()
        .mockResolvedValue({ message: 'If the email exists, a reset link has been sent' }),
      resetPassword: jest
        .fn()
        .mockResolvedValue({ message: 'Password reset successfully' }),
      verifyEmail: jest.fn().mockResolvedValue({ message: 'Email verified successfully' }),
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      refreshTokens: jest.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
      logout: jest.fn().mockResolvedValue(undefined),
      googleLogin: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ ttl: 60000, limit: 60 }],
        }),
      ],
      controllers: [AuthController],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: AuthService, useValue: authServiceMock },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test'),
          },
        },
      ],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({
        canActivate: (context: Parameters<LocalAuthGuard['canActivate']>[0]) => {
          const req = context.switchToHttp().getRequest<{ user?: unknown }>();
          req.user = { id: 1, email: 'user@example.com', role: 'customer' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 429 when login endpoint is spammed beyond limit', async () => {
    const endpoint = '/api/v1/auth/login';

    for (let i = 0; i < 10; i += 1) {
      await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: 'user@example.com', password: 'password' })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post(endpoint)
      .send({ email: 'user@example.com', password: 'password' })
      .expect(429);
  });

  it('should return 429 when forgot-password endpoint is spammed beyond limit', async () => {
    const endpoint = '/api/v1/auth/forgot-password';

    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: 'user@example.com' })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post(endpoint)
      .send({ email: 'user@example.com' })
      .expect(429);
  });

  it('should return 429 when reset-password endpoint is spammed beyond limit', async () => {
    const endpoint = '/api/v1/auth/reset-password';

    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer())
        .post(endpoint)
        .send({ token: 'token-123', newPassword: 'new-password' })
        .expect(200);
    }

    await request(app.getHttpServer())
      .post(endpoint)
      .send({ token: 'token-123', newPassword: 'new-password' })
      .expect(429);
  });
});
