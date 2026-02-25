import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';

export function rateLimiter(options: { maxRequests: number; windowSeconds: number }) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    try {
      const ip = c.req.header('CF-Connecting-IP') || 'unknown';
      const key = `rl:${ip}:${c.req.path}`;

      const current = await c.env.KV.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= options.maxRequests) {
        return c.json({ error: 'Too many requests. Please try again later.' }, 429);
      }

      await c.env.KV.put(key, String(count + 1), {
        expirationTtl: options.windowSeconds,
      });
    } catch {
      // KV quota exceeded or unavailable — allow request through
    }

    await next();
  });
}
