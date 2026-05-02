import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from '../../services/auth.service.js';
import { RegisterDto } from '../../dtos/register.dto.js';
import { VerifyEmailDto } from '../../dtos/verify-email.dto.js';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
} from '../../dtos/forgot-password.dto.js';
import { LocalAuthGuard } from '../../guards/local-auth.guard.js';
import { Public, CurrentUser } from '../../../../common/decorators/index.js';
import { AuthGuard } from '@nestjs/passport';
import {
  setAuthCookies,
  clearAuthCookies,
} from '../../../../common/utils/cookie.util.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.register(dto);
    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      this.configService,
    );
    return { user };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as { id: number; email: string; role: string };
    const { user: userData, tokens } = await this.authService.login(user);
    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      this.configService,
    );
    return { user: userData };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      clearAuthCookies(res);
      throw new Error('Refresh token not found');
    }
    const tokens = await this.authService.refreshTokens(refreshToken);
    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      this.configService,
    );
    return { message: 'Token refreshed successfully' };
  }

  @Get('me')
  getMe(@CurrentUser() user: { id: number; email: string; role: string }) {
    return user;
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@CurrentUser('email') email: string) {
    await this.authService.sendVerificationEmail(email);
    return { message: 'Verification email sent' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google')
  async googleAuth() {
    // Passport redirects to Google
  }

  @Public()
  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const googleUser = req.user as {
      googleId: string;
      email: string;
      fullName: string;
      avatar?: string;
    };
    const { tokens } = await this.authService.googleLogin(googleUser);
    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      this.configService,
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    res.redirect(`${frontendUrl}/auth/callback?success=true`);
  }
}
