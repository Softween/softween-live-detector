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
  /** Sentry ingest DSN, leave unset to disable error reporting. */
  SENTRY_DSN?: string;
  SENTRY_RELEASE?: string;
  /** X-SRE-Probe value for checks on partner/admin.glossgo.com (glossgo WAF), leave unset to send no header. */
  SRE_PROBE_HEADER_SECRET?: string;
  // Gmail REST API credentials (service account with domain-wide delegation)
  GMAIL_CLIENT_EMAIL: string;
  GMAIL_PRIVATE_KEY: string;
  GMAIL_SENDER_EMAIL: string;
}
