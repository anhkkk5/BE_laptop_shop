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
import { TokenResponseDto } from '../dtos/token-response.dto.js';
import { User } from '../../user/entities/user.entity.js';
import { JwtPayload } from '../strategies/jwt.strategy.js';
import { UserRole } from '../../user/enums/user-role.enum.js';

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

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
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

    return this.generateTokens(user);
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password' | 'refreshToken'> | null> {
    const user = await this.userService.findByEmail(email);
    if (!user || !user.password) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    const { password: _, refreshToken: __, ...result } = user;
    return result;
  }

  async login(user: {
    id: number;
    email: string;
    role: string;
  }): Promise<TokenResponseDto> {
    const fullUser = await this.userService.findById(user.id);
    await this.userService.updateLastLogin(user.id);
    return this.generateTokens(fullUser);
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponseDto> {
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
  }): Promise<TokenResponseDto> {
    let user = await this.userService.findByGoogleId(googleUser.googleId);

    if (!user) {
      user = await this.userService.findByEmail(googleUser.email);

      if (user) {
        await this.userService.adminUpdate(user.id, {
          ...({ googleId: googleUser.googleId } as any),
        });
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
    return this.generateTokens(user);
  }

  private async generateTokens(user: User): Promise<TokenResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(
      payload as unknown as Record<string, unknown>,
      { secret: this.accessSecret, expiresIn: this.accessExpiresIn as any },
    );

    const refreshToken = this.jwtService.sign(
      payload as unknown as Record<string, unknown>,
      {
        secret: this.refreshSecret,
        expiresIn: `${this.refreshTtlSeconds}s` as any,
      },
    );

    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.userService.updateRefreshToken(user.id, hashedRefresh);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessExpiresIn,
    };
  }

  private async revokeRefreshToken(token: string): Promise<void> {
    await this.redis.set(`revoked:${token}`, '1', 'EX', this.refreshTtlSeconds);
  }
}
