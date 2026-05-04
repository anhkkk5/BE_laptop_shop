const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'oldpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'api_key',
  'x-api-key',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function shouldRedact(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return '[MAX_DEPTH]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: Record<string, unknown> = {};

  for (const [key, itemValue] of Object.entries(value)) {
    if (shouldRedact(key)) {
      result[key] = '[REDACTED]';
      continue;
    }

    result[key] = redactValue(itemValue, depth + 1);
  }

  return result;
}
