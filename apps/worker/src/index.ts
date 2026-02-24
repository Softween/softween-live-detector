import { Hono } from 'hono';
import { createCors } from './middleware/cors';
import { authRoutes } from './routes/auth.routes';
import { monitorRoutes } from './routes/monitors.routes';
import { checkRoutes } from './routes/checks.routes';
import { handleScheduled } from './cron/scheduled';
import type { Env } from './env';

const app = new Hono<{ Bindings: Env }>();

// CORS - applied per request since we need env for origin
app.use('/api/*', async (c, next) => {
  const corsMiddleware = createCors(c.env);
  return corsMiddleware(c, next);
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/monitors', monitorRoutes);
app.route('/api/checks', checkRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    return c.json({ error: 'Geçersiz JSON formatı' }, 400);
  }
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default {
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(controller, env));
  },
};
