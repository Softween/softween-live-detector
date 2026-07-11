import {
  withSentry,
  captureException as sentryCaptureException,
  captureMessage as sentryCaptureMessage,
} from '@sentry/cloudflare';
import type { ErrorEvent, SeverityLevel, CloudflareOptions } from '@sentry/cloudflare';
import type { Env } from '../env';

function sentryOptions(env: Env): CloudflareOptions {
  return {
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT ?? 'development',
    release: `softween-live-detector@${env.SENTRY_RELEASE ?? 'unknown'}`,
    tracesSampleRate: 0.5,
    _experiments: {
      enableLogs: true,
    },
    beforeSend(event: ErrorEvent) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
      }
      return event;
    },
  };
}

export function withSentryHandlers(handler: ExportedHandler<Env>): ExportedHandler<Env> {
  return withSentry<Env>(sentryOptions, handler);
}

export function captureException(
  err: unknown,
  extras?: Record<string, unknown>,
) {
  sentryCaptureException(err, extras ? { extra: extras } : undefined);
}

export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
) {
  sentryCaptureMessage(message, level);
}
