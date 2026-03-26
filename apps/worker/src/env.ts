export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  AI: Ai;
  JWT_SECRET: string;
  /** @deprecated Kept for backward compat — Gmail is now used instead of Resend */
  RESEND_API_KEY: string;
  ENVIRONMENT: string;
  FRONTEND_URL: string;
  SERPAPI_KEY?: string;
  SENTRY_RELEASE?: string;
  // Gmail REST API credentials (service account with domain-wide delegation)
  GMAIL_CLIENT_EMAIL: string;
  GMAIL_PRIVATE_KEY: string;
  GMAIL_SENDER_EMAIL: string;
}
