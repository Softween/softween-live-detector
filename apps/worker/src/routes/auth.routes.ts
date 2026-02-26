import { Hono } from 'hono';
import {
  registerSchema, loginSchema, updateNotificationSettingsSchema,
  forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, deleteAccountSchema,
} from 'shared';
import {
  registerUser, loginUser, getUserById,
  changePassword, resetPasswordWithToken, createPasswordResetToken,
  createEmailVerificationToken, verifyEmail, deleteAccount,
} from '../services/auth.service';
import { createMonitor } from '../services/monitor.service';
import { pingMonitor } from '../services/ping.service';
import { signJWT } from '../lib/jwt';
import { sendEmail, buildPasswordResetEmailHtml, buildEmailVerificationHtml } from '../lib/resend';
import { authMiddleware, setAuthCookie, clearAuthCookie } from '../middleware/auth';
import { rateLimiter } from '../middleware/rate-limit';
import type { Env } from '../env';

type AuthEnv = {
  Bindings: Env;
  Variables: { userId: string; userEmail: string };
};

const auth = new Hono<AuthEnv>();

// Rate limit auth endpoints
auth.use('/register', rateLimiter({ maxRequests: 5, windowSeconds: 300 }));
auth.use('/login', rateLimiter({ maxRequests: 10, windowSeconds: 300 }));
auth.use('/forgot-password', rateLimiter({ maxRequests: 5, windowSeconds: 300 }));
auth.use('/reset-password', rateLimiter({ maxRequests: 5, windowSeconds: 300 }));

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

    // Send verification email + create sample monitor in background
    c.executionCtx.waitUntil(
      (async () => {
        try {
          // Send email verification
          const verifyToken = await createEmailVerificationToken(c.env, user.id);
          const verifyUrl = `${c.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;
          await sendEmail({
            to: user.email,
            subject: 'LiveDetector - Email Doğrulama',
            html: buildEmailVerificationHtml(verifyUrl),
          }, c.env.RESEND_API_KEY);
        } catch { /* verification email is best-effort */ }

        try {
          // Create sample monitor
          const sample = await createMonitor(c.env, user.id, {
            name: 'Tesla (Sample)',
            url: 'https://www.tesla.com',
            method: 'GET',
            expected_status: 200,
            timeout_ms: 10000,
          });
          const result = await pingMonitor({
            id: sample.id,
            url: sample.url,
            method: sample.method,
            expected_status: sample.expected_status,
            timeout_ms: sample.timeout_ms,
            current_status: sample.current_status,
            check_keyword: null,
          });
          await c.env.DB.prepare(
            `INSERT INTO checks (id, monitor_id, status, status_code, response_time_ms, error_message) VALUES (?, ?, ?, ?, ?, ?)`,
          ).bind(result.id, result.monitorId, result.status, result.statusCode, result.responseTime, result.error).run();
          await c.env.DB.prepare(
            "UPDATE monitors SET current_status = ?, last_checked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
          ).bind(result.status, result.monitorId).run();
        } catch { /* sample monitor is best-effort */ }
      })(),
    );

    c.header('Set-Cookie', setAuthCookie(token, isProduction));
    return c.json({ id: user.id, email: user.email, name: user.name, email_verified: user.email_verified }, 201);
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
    return c.json({ id: user.id, email: user.email, name: user.name, email_verified: user.email_verified });
  } catch (err: unknown) {
    console.error('Login error:', err);
    const message = err instanceof Error ? err.message : 'Giriş başarısız';
    return c.json({ error: message }, 500);
  }
});

auth.post('/forgot-password', async (c) => {
  const body = await c.req.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  // Always return success to prevent email enumeration
  const result = await createPasswordResetToken(c.env, parsed.data.email);

  if (result) {
    const resetUrl = `${c.env.FRONTEND_URL}/reset-password?token=${result.token}`;
    c.executionCtx.waitUntil(
      sendEmail({
        to: parsed.data.email,
        subject: 'LiveDetector - Şifre Sıfırlama',
        html: buildPasswordResetEmailHtml(resetUrl),
      }, c.env.RESEND_API_KEY),
    );
  }

  return c.json({ success: true });
});

auth.post('/reset-password', async (c) => {
  const body = await c.req.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const success = await resetPasswordWithToken(c.env, parsed.data.token, parsed.data.password);

  if (!success) {
    return c.json({ error: 'Geçersiz veya süresi dolmuş token' }, 400);
  }

  return c.json({ success: true });
});

auth.post('/verify-email', async (c) => {
  const body = await c.req.json();
  const token = body?.token;

  if (!token || typeof token !== 'string') {
    return c.json({ error: 'Token gerekli' }, 400);
  }

  const success = await verifyEmail(c.env, token);

  if (!success) {
    return c.json({ error: 'Geçersiz veya süresi dolmuş token' }, 400);
  }

  return c.json({ success: true });
});

auth.post('/resend-verification', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const userEmail = c.get('userEmail');

  const user = await getUserById(c.env, userId);
  if (!user || user.email_verified === 1) {
    return c.json({ error: 'Email zaten doğrulanmış' }, 400);
  }

  const verifyToken = await createEmailVerificationToken(c.env, userId);
  const verifyUrl = `${c.env.FRONTEND_URL}/verify-email?token=${verifyToken}`;

  c.executionCtx.waitUntil(
    sendEmail({
      to: userEmail,
      subject: 'LiveDetector - Email Doğrulama',
      html: buildEmailVerificationHtml(verifyUrl),
    }, c.env.RESEND_API_KEY),
  );

  return c.json({ success: true });
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

auth.put('/password', authMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const userId = c.get('userId');
  const success = await changePassword(c.env, userId, parsed.data.current_password, parsed.data.new_password);

  if (!success) {
    return c.json({ error: 'Mevcut şifre hatalı' }, 400);
  }

  return c.json({ success: true });
});

auth.delete('/account', authMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = deleteAccountSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const userId = c.get('userId');
  const isProduction = c.env.ENVIRONMENT === 'production';
  const success = await deleteAccount(c.env, userId, parsed.data.password);

  if (!success) {
    return c.json({ error: 'Şifre hatalı' }, 400);
  }

  c.header('Set-Cookie', clearAuthCookie(isProduction));
  return c.json({ success: true });
});

auth.get('/notifications', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const settings = await c.env.DB.prepare(
    'SELECT email_enabled, cooldown_minutes, webhook_url, webhook_enabled, slow_threshold_ms, slow_alert_enabled, telegram_bot_token, telegram_chat_id, telegram_enabled, weekly_report_enabled FROM notification_settings WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ email_enabled: number; cooldown_minutes: number; webhook_url: string | null; webhook_enabled: number; slow_threshold_ms: number | null; slow_alert_enabled: number; telegram_bot_token: string | null; telegram_chat_id: string | null; telegram_enabled: number; weekly_report_enabled: number }>();

  if (!settings) {
    return c.json({ email_enabled: true, cooldown_minutes: 15, webhook_url: '', webhook_enabled: false, slow_threshold_ms: null, slow_alert_enabled: false, telegram_bot_token: '', telegram_chat_id: '', telegram_enabled: false, weekly_report_enabled: false });
  }

  return c.json({
    email_enabled: settings.email_enabled === 1,
    cooldown_minutes: settings.cooldown_minutes,
    webhook_url: settings.webhook_url || '',
    webhook_enabled: settings.webhook_enabled === 1,
    slow_threshold_ms: settings.slow_threshold_ms,
    slow_alert_enabled: settings.slow_alert_enabled === 1,
    telegram_bot_token: settings.telegram_bot_token || '',
    telegram_chat_id: settings.telegram_chat_id || '',
    telegram_enabled: settings.telegram_enabled === 1,
    weekly_report_enabled: settings.weekly_report_enabled === 1,
  });
});

auth.put('/notifications', authMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = updateNotificationSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const userId = c.get('userId');
  const webhookUrl = parsed.data.webhook_url || null;
  const webhookEnabled = parsed.data.webhook_enabled ? 1 : 0;
  const slowThreshold = parsed.data.slow_threshold_ms ?? null;
  const slowEnabled = parsed.data.slow_alert_enabled ? 1 : 0;
  const telegramBotToken = parsed.data.telegram_bot_token || null;
  const telegramChatId = parsed.data.telegram_chat_id || null;
  const telegramEnabled = parsed.data.telegram_enabled ? 1 : 0;
  const weeklyReportEnabled = parsed.data.weekly_report_enabled ? 1 : 0;

  await c.env.DB.prepare(
    'UPDATE notification_settings SET email_enabled = ?, cooldown_minutes = ?, webhook_url = ?, webhook_enabled = ?, slow_threshold_ms = ?, slow_alert_enabled = ?, telegram_bot_token = ?, telegram_chat_id = ?, telegram_enabled = ?, weekly_report_enabled = ? WHERE user_id = ?',
  )
    .bind(parsed.data.email_enabled ? 1 : 0, parsed.data.cooldown_minutes, webhookUrl, webhookEnabled, slowThreshold, slowEnabled, telegramBotToken, telegramChatId, telegramEnabled, weeklyReportEnabled, userId)
    .run();

  return c.json({
    email_enabled: parsed.data.email_enabled,
    cooldown_minutes: parsed.data.cooldown_minutes,
    webhook_url: webhookUrl || '',
    webhook_enabled: parsed.data.webhook_enabled || false,
    slow_threshold_ms: slowThreshold,
    slow_alert_enabled: parsed.data.slow_alert_enabled || false,
    telegram_bot_token: telegramBotToken || '',
    telegram_chat_id: telegramChatId || '',
    telegram_enabled: parsed.data.telegram_enabled || false,
    weekly_report_enabled: parsed.data.weekly_report_enabled || false,
  });
});

export { auth as authRoutes };
