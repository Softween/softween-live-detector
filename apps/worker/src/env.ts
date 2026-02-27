export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  AI: Ai;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  ENVIRONMENT: string;
  FRONTEND_URL: string;
  SERPAPI_KEY?: string;
}
