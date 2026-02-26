import { cors } from 'hono/cors';
import type { Env } from '../env';

export function createCors(env: Env) {
  return cors({
    origin: (origin) => {
      const allowed = [env.FRONTEND_URL, 'https://livedetector.softween.com', 'https://softween-live-checker.pages.dev', 'http://localhost:5173'];
      return allowed.includes(origin) ? origin : env.FRONTEND_URL;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
    maxAge: 86400,
  });
}
