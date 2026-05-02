import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
}

/**
 * Set authentication cookies (access_token and refresh_token)
 * @param res Express Response object
 * @param accessToken JWT access token
 * @param refreshToken JWT refresh token
 * @param configService NestJS ConfigService (optional, for environment-specific settings)
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  configService?: ConfigService,
): void {
  const isProduction =
    configService?.get<string>('NODE_ENV') === 'production' || false;

  // Access token cookie (15 minutes)
  const accessTokenOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction, // Only HTTPS in production
    sameSite: 'strict',
    maxAge: 900000, // 15 minutes in milliseconds
    path: '/',
  };

  // Refresh token cookie (7 days)
  const refreshTokenOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction, // Only HTTPS in production
    sameSite: 'strict',
    maxAge: 604800000, // 7 days in milliseconds
    path: '/',
  };

  res.cookie('access_token', accessToken, accessTokenOptions);
  res.cookie('refresh_token', refreshToken, refreshTokenOptions);
}

/**
 * Clear authentication cookies (logout)
 * @param res Express Response object
 */
export function clearAuthCookies(res: Response): void {
  const clearOptions: CookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0, // Expire immediately
    path: '/',
  };

  res.cookie('access_token', '', clearOptions);
  res.cookie('refresh_token', '', clearOptions);
}
