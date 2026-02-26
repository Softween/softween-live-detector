import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../env';

type WebhookEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const webhooks = new Hono<WebhookEnv>();

// Test webhook
webhooks.post('/test', authMiddleware, async (c) => {
  const { url } = await c.req.json();
  if (!url) return c.json({ error: 'URL gerekli' }, 400);

  const userId = c.get('userId');
  const id = crypto.randomUUID();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '🧪 LiveDetector Test Webhook',
        embeds: [{
          title: '🧪 Test Mesajı',
          description: 'Bu bir test mesajıdır. Webhook bağlantınız başarılı!',
          color: 0x7c3aed,
          timestamp: new Date().toISOString(),
          footer: { text: 'LiveDetector' },
        }],
      }),
    });

    const responseBody = await response.text().catch(() => '');

    await c.env.DB.prepare(
      'INSERT INTO webhook_logs (id, user_id, url, status_code, response_body) VALUES (?, ?, ?, ?, ?)',
    ).bind(id, userId, url, response.status, responseBody.substring(0, 500)).run();

    return c.json({ success: response.ok, status: response.status });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Bağlantı hatası';

    await c.env.DB.prepare(
      'INSERT INTO webhook_logs (id, user_id, url, error) VALUES (?, ?, ?, ?)',
    ).bind(id, userId, url, error).run();

    return c.json({ success: false, error }, 400);
  }
});

// Get webhook logs
webhooks.get('/logs', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const result = await c.env.DB.prepare(
    'SELECT * FROM webhook_logs WHERE user_id = ? ORDER BY sent_at DESC LIMIT 20',
  ).bind(userId).all();
  return c.json(result.results);
});

export { webhooks as webhookRoutes };
