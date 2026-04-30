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
import type { Request, Response } from 'express';
import { AuthService } from '../../services/auth.service.js';
import { RegisterDto } from '../../dtos/register.dto.js';
import { LocalAuthGuard } from '../../guards/local-auth.guard.js';
import { Public, CurrentUser } from '../../../../common/decorators/index.js';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Req() req: Request) {
    const user = req.user as { id: number; email: string; role: string };
    return this.authService.login(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body('refreshToken') refreshToken: string) {
    await this.authService.logout(refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  @Get('me')
  getMe(@CurrentUser() user: { id: number; email: string; role: string }) {
    return user;
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
    const tokens = await this.authService.googleLogin(googleUser);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }
}
