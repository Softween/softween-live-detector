import { Hono } from 'hono';
import { registerSchema, loginSchema, updateNotificationSettingsSchema } from 'shared';
import { registerUser, loginUser, getUserById } from '../services/auth.service';
import { signJWT } from '../lib/jwt';
import { authMiddleware, setAuthCookie, clearAuthCookie } from '../middleware/auth';
import { rateLimiter } from '../middleware/rate-limit';
import type { Env } from '../env';

type AuthEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const auth = new Hono<AuthEnv>();

// Rate limit auth endpoints (5 attempts per 5 minutes)
auth.use('/register', rateLimiter({ maxRequests: 5, windowSeconds: 300 }));
auth.use('/login', rateLimiter({ maxRequests: 10, windowSeconds: 300 }));

auth.post('/register', async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  try {
    const user = await registerUser(c.env, parsed.data.email, parsed.data.password, parsed.data.name);
    const token = await signJWT({ sub: user.id, email: user.email }, c.env.JWT_SECRET);
    const isProduction = c.env.ENVIRONMENT === 'production';

    c.header('Set-Cookie', setAuthCookie(token, isProduction));
    return c.json({ id: user.id, email: user.email, name: user.name }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Kayıt başarısız';
    return c.json({ error: message }, 400);
  }
});

auth.post('/login', async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Geçersiz giriş bilgileri' }, 400);
  }

  try {
    const user = await loginUser(c.env, parsed.data.email, parsed.data.password);
    if (!user) {
      return c.json({ error: 'Email veya şifre hatalı' }, 401);
    }

    const token = await signJWT({ sub: user.id, email: user.email }, c.env.JWT_SECRET);
    const isProduction = c.env.ENVIRONMENT === 'production';

    c.header('Set-Cookie', setAuthCookie(token, isProduction));
    return c.json({ id: user.id, email: user.email, name: user.name });
  } catch (err: unknown) {
    console.error('Login error:', err);
    const message = err instanceof Error ? err.message : 'Giriş başarısız';
    return c.json({ error: message }, 500);
  }
});

auth.post('/logout', authMiddleware, async (c) => {
  const isProduction = c.env.ENVIRONMENT === 'production';
  c.header('Set-Cookie', clearAuthCookie(isProduction));
  return c.json({ success: true });
});

auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const user = await getUserById(c.env, userId);

  if (!user) {
    return c.json({ error: 'Kullanıcı bulunamadı' }, 404);
  }

  return c.json(user);
});

auth.get('/notifications', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const settings = await c.env.DB.prepare(
    'SELECT email_enabled, cooldown_minutes FROM notification_settings WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ email_enabled: number; cooldown_minutes: number }>();

  if (!settings) {
    return c.json({ email_enabled: true, cooldown_minutes: 15 });
  }

  return c.json({
    email_enabled: settings.email_enabled === 1,
    cooldown_minutes: settings.cooldown_minutes,
  });
});

auth.put('/notifications', authMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = updateNotificationSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const userId = c.get('userId');
  await c.env.DB.prepare(
    'UPDATE notification_settings SET email_enabled = ?, cooldown_minutes = ? WHERE user_id = ?',
  )
    .bind(parsed.data.email_enabled ? 1 : 0, parsed.data.cooldown_minutes, userId)
    .run();

  return c.json({ email_enabled: parsed.data.email_enabled, cooldown_minutes: parsed.data.cooldown_minutes });
});

export { auth as authRoutes };
