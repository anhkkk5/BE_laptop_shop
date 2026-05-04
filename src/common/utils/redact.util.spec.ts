import { redactValue } from './redact.util';

describe('redactValue', () => {
  it('should mask sensitive keys at top-level and nested levels', () => {
    const payload = {
      email: 'user@example.com',
      password: 'raw-password',
      profile: {
        refreshToken: 'refresh-token-value',
        nested: {
          apiKey: 'abc-123',
        },
      },
    };

    const result = redactValue(payload) as Record<string, unknown>;

    expect(result).toEqual({
      email: 'user@example.com',
      password: '[REDACTED]',
      profile: {
        refreshToken: '[REDACTED]',
        nested: {
          apiKey: '[REDACTED]',
        },
      },
    });
  });

  it('should preserve non-sensitive values', () => {
    const payload = {
      id: 1,
      status: 'ok',
      items: [{ sku: 'A1', qty: 2 }],
    };

    const result = redactValue(payload);

    expect(result).toEqual(payload);
  });
});
