import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import {
  clearAuthCookies,
  setAuthCookies,
} from '../../../../common/utils/cookie.util.js';

jest.mock('../../../../common/utils/cookie.util.js', () => ({
  clearAuthCookies: jest.fn(),
  setAuthCookies: jest.fn(),
}));

const THROTTLER_LIMIT_KEY = 'THROTTLER:LIMITdefault';
const THROTTLER_TTL_KEY = 'THROTTLER:TTLdefault';

describe('AuthController', () => {
  const createController = () => {
    const authService = {
      refreshTokens: jest.fn(),
      logout: jest.fn(),
    };

    const configService = {
      get: jest.fn(),
    };

    const controller = new AuthController(
      authService as never,
      configService as never,
    );

    const response = {} as never;

    return {
      controller,
      authService,
      response,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw UnauthorizedException and clear cookies when refresh token is missing', async () => {
    const { controller, response } = createController();

    await expect(
      controller.refresh({ cookies: {} } as never, response),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(clearAuthCookies).toHaveBeenCalledWith(response);
  });

  it('should clear cookies and rethrow when refresh token verification fails', async () => {
    const { controller, authService, response } = createController();
    authService.refreshTokens.mockRejectedValueOnce(
      new UnauthorizedException('Invalid refresh token'),
    );

    await expect(
      controller.refresh(
        { cookies: { refresh_token: 'bad-token' } } as never,
        response,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(clearAuthCookies).toHaveBeenCalledWith(response);
    expect(setAuthCookies).not.toHaveBeenCalled();
  });

  it('should clear cookies and return success on logout without refresh token', async () => {
    const { controller, authService, response } = createController();

    const result = await controller.logout({ cookies: {} } as never, response);

    expect(result).toEqual({ message: 'Logged out successfully' });
    expect(authService.logout).not.toHaveBeenCalled();
    expect(clearAuthCookies).toHaveBeenCalledWith(response);
  });

  it('should revoke refresh token and clear cookies on logout with refresh token', async () => {
    const { controller, authService, response } = createController();

    const result = await controller.logout(
      { cookies: { refresh_token: 'rt-123' } } as never,
      response,
    );

    expect(result).toEqual({ message: 'Logged out successfully' });
    expect(authService.logout).toHaveBeenCalledWith('rt-123');
    expect(clearAuthCookies).toHaveBeenCalledWith(response);
  });

  it('should have throttle profiles on sensitive auth endpoints', () => {
    const getMethod = (name: keyof AuthController) =>
      AuthController.prototype[name] as unknown as Function;

    const expectThrottle = (
      methodName: keyof AuthController,
      limit: number,
      ttl: number,
    ) => {
      const method = getMethod(methodName);
      const configuredLimit = Reflect.getMetadata(THROTTLER_LIMIT_KEY, method);
      const configuredTtl = Reflect.getMetadata(THROTTLER_TTL_KEY, method);

      expect(configuredLimit).toBe(limit);
      expect(configuredTtl).toBe(ttl);
    };

    expectThrottle('register', 10, 60000);
    expectThrottle('login', 10, 60000);
    expectThrottle('refresh', 20, 60000);
    expectThrottle('verifyEmail', 10, 60000);
    expectThrottle('resendVerification', 5, 60000);
    expectThrottle('forgotPassword', 5, 60000);
    expectThrottle('resetPassword', 5, 60000);
  });
});
