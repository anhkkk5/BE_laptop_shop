import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { UserService } from '../../user/services/user.service.js';
import { RegisterDto } from '../dtos/register.dto.js';
import { User } from '../../user/entities/user.entity.js';
import { JwtPayload } from '../strategies/jwt.strategy.js';
import { UserRole } from '../../user/enums/user-role.enum.js';
import { MailService } from '../../mail/mail.service.js';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshTtlSeconds: number;
  private readonly bcryptSaltRounds: number;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    private readonly mailService: MailService,
  ) {
    this.accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET')!;
    this.accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    this.refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET')!;
    this.refreshTtlSeconds = this.configService.get<number>(
      'REFRESH_TOKEN_TTL_SECONDS',
      604800,
    );
    this.bcryptSaltRounds = this.configService.get<number>(
      'BCRYPT_SALT_ROUNDS',
      10,
    );
  }

  async register(dto: RegisterDto): Promise<{
    user: Omit<User, 'password' | 'refreshToken'>;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(
      dto.password,
      this.bcryptSaltRounds,
    );

    const user = await this.userService.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      role: UserRole.CUSTOMER,
    });

    const tokens = await this.generateTokens(user);

    await this.sendVerificationEmail(user.email);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...userWithoutSensitiveData } = user;

    return { user: userWithoutSensitiveData, tokens };
  }

  async sendVerificationEmail(email: string): Promise<void> {
    const user = await this.userService.findByEmail(email);
    if (!user) throw new BadRequestException('Email not found');
    if (user.isVerified)
      throw new BadRequestException('Email already verified');

    const token = randomBytes(32).toString('hex');
    await this.redis.set(`verify:${token}`, String(user.id), 'EX', 86400);

    await this.mailService.sendVerificationEmail(email, token);
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const userId = await this.redis.get(`verify:${token}`);
    if (!userId) throw new BadRequestException('Invalid or expired token');

    await this.userService.verifyEmail(Number(userId));
    await this.redis.del(`verify:${token}`);

    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = randomBytes(32).toString('hex');
    await this.redis.set(`reset:${token}`, String(user.id), 'EX', 3600);

    await this.mailService.sendPasswordResetEmail(email, token);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const userId = await this.redis.get(`reset:${token}`);
    if (!userId) throw new BadRequestException('Invalid or expired token');

    const hashedPassword = await bcrypt.hash(
      newPassword,
      this.bcryptSaltRounds,
    );
    await this.userService.updatePassword(Number(userId), hashedPassword);
    await this.redis.del(`reset:${token}`);

    return { message: 'Password reset successfully' };
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password' | 'refreshToken'> | null> {
    const user = await this.userService.findByEmail(email);
    if (!user || !user.password) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    const { password: _pwd, refreshToken: _rt, ...result } = user;
    return result;
  }

  async login(user: { id: number; email: string; role: string }): Promise<{
    user: Omit<User, 'password' | 'refreshToken'>;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const fullUser = await this.userService.findById(user.id);
    await this.userService.updateLastLogin(user.id);
    const tokens = await this.generateTokens(fullUser);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...userWithoutSensitiveData } = fullUser;

    return { user: userWithoutSensitiveData, tokens };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });

      const isRevoked = await this.redis.get(`revoked:${refreshToken}`);
      if (isRevoked) throw new UnauthorizedException('Token revoked');

      const user = await this.userService.findById(payload.sub);
      if (!user) throw new UnauthorizedException('User not found');

      await this.revokeRefreshToken(refreshToken);

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    if (refreshToken) {
      await this.revokeRefreshToken(refreshToken);
    }
  }

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    fullName: string;
    avatar?: string;
  }): Promise<{
    user: Omit<User, 'password' | 'refreshToken'>;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    let user = await this.userService.findByGoogleId(googleUser.googleId);

    if (!user) {
      user = await this.userService.findByEmail(googleUser.email);

      if (user) {
        await this.userService.adminUpdate(user.id, {
          googleId: googleUser.googleId,
        } as unknown as Parameters<typeof this.userService.adminUpdate>[1]);
        user = await this.userService.findById(user.id);
      } else {
        user = await this.userService.create({
          email: googleUser.email,
          fullName: googleUser.fullName,
          avatar: googleUser.avatar,
          googleId: googleUser.googleId,
          role: UserRole.CUSTOMER,
        });
      }
    }

    await this.userService.updateLastLogin(user.id);
    const tokens = await this.generateTokens(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...userWithoutSensitiveData } = user;

    return { user: userWithoutSensitiveData, tokens };
  }

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(
      payload as unknown as Record<string, unknown>,
      {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn as unknown as number,
      },
    );

    const refreshToken = this.jwtService.sign(
      payload as unknown as Record<string, unknown>,
      {
        secret: this.refreshSecret,
        expiresIn: `${this.refreshTtlSeconds}s` as unknown as number,
      },
    );

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.userService.updateRefreshToken(user.id, hashedRefresh);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async revokeRefreshToken(token: string): Promise<void> {
    await this.redis.set(`revoked:${token}`, '1', 'EX', this.refreshTtlSeconds);
  }
}
