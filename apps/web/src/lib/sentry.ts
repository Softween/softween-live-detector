import * as Sentry from '@sentry/react';

export function initSentry() {
  Sentry.init({
    dsn: 'https://28abf698166f81869f531e551e0069e8@o4510972743843840.ingest.us.sentry.io/4511111058030592',
    environment: import.meta.env.MODE,
    release: 'softween-live-detector-web@0.0.1',
    tracesSampleRate: 0.5,
    _experiments: {
      enableLogs: true,
    },
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
  });
}
