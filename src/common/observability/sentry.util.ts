import { createRequire } from 'node:module';

type SentryLike = {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
};

let sentryInstance: SentryLike | null = null;
let sentryLoadAttempted = false;

function loadSentry(): SentryLike | null {
  if (sentryLoadAttempted) {
    return sentryInstance;
  }

  sentryLoadAttempted = true;

  const dynamicRequire = createRequire(process.cwd() + '/package.json');

  try {
    const moduleValue = dynamicRequire('@sentry/node') as {
      init?: (options: Record<string, unknown>) => void;
      captureException?: (
        error: unknown,
        context?: Record<string, unknown>,
      ) => void;
    };

    if (
      moduleValue &&
      typeof moduleValue.init === 'function' &&
      typeof moduleValue.captureException === 'function'
    ) {
      sentryInstance = {
        init: moduleValue.init,
        captureException: moduleValue.captureException,
      };
    }
  } catch {
    sentryInstance = null;
  }

  return sentryInstance;
}

export function initSentryIfConfigured(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return;
  }

  const sentry = loadSentry();
  if (!sentry) {
    console.warn(
      'SENTRY_DSN is set but @sentry/node is not installed. Skipping Sentry init.',
    );
    return;
  }

  sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
  });
}

export function captureExceptionToSentry(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const sentry = loadSentry();
  if (!sentry) {
    return;
  }

  sentry.captureException(error, context);
}
