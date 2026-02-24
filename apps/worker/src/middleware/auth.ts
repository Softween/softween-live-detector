import { createMiddleware } from 'hono/factory';
import { verifyJWT } from '../lib/jwt';
import type { Env } from '../env';

type AuthEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const cookieHeader = c.req.header('Cookie') || '';
  const token = parseCookie(cookieHeader, 'auth_token');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  c.set('userId', payload.sub);
  c.set('userEmail', payload.email);
  await next();
});

function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setAuthCookie(token: string, isProduction: boolean): string {
  if (isProduction) {
    return `auth_token=${token}; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=${7 * 24 * 60 * 60}`;
  }
  return `auth_token=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`;
}

export function clearAuthCookie(isProduction: boolean): string {
  if (isProduction) {
    return `auth_token=; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=0`;
  }
  return `auth_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
