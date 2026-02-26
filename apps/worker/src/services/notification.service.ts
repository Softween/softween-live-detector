import { sendEmail, buildDownEmailHtml, buildUpEmailHtml, buildSlowResponseEmailHtml } from '../lib/resend';
import type { Env } from '../env';

export async function sendStatusNotification(
  monitorId: string,
  type: 'down' | 'up',
  errorMessage: string | null,
  env: Env,
): Promise<void> {
  const monitor = await env.DB.prepare(
    `SELECT m.name, m.url, m.user_id, u.email, ns.email_enabled, ns.cooldown_minutes, ns.webhook_url, ns.webhook_enabled
     FROM monitors m
     JOIN users u ON m.user_id = u.id
     LEFT JOIN notification_settings ns ON u.id = ns.user_id
     WHERE m.id = ?`,
  )
    .bind(monitorId)
    .first<{
      name: string;
      url: string;
      user_id: string;
      email: string;
      email_enabled: number | null;
      cooldown_minutes: number | null;
      webhook_url: string | null;
      webhook_enabled: number | null;
    }>();

  if (!monitor) return;

  if (monitor.email_enabled === 0) return;

  const cooldownMinutes = monitor.cooldown_minutes || 15;
  const recentNotification = await env.DB.prepare(
    `SELECT id FROM notification_log
     WHERE monitor_id = ? AND type = ? AND sent_at > datetime('now', '-' || ? || ' minutes')
     LIMIT 1`,
  )
    .bind(monitorId, type, cooldownMinutes)
    .first();

  if (recentNotification) return;

  const subject =
    type === 'down'
      ? `[DOWN] ${monitor.name} erişilemez durumda`
      : `[UP] ${monitor.name} tekrar aktif`;

  const html =
    type === 'down'
      ? buildDownEmailHtml(monitor.name, monitor.url, errorMessage || 'Bilinmeyen hata')
      : buildUpEmailHtml(monitor.name, monitor.url);

  const sent = await sendEmail({ to: monitor.email, subject, html }, env.RESEND_API_KEY);

  if (sent) {
    await env.DB.prepare(
      `INSERT INTO notification_log (id, user_id, monitor_id, type)
       VALUES (?, ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), monitor.user_id, monitorId, type)
      .run();
  }

  // Webhook notification (Discord/Slack compatible)
  if (monitor.webhook_enabled === 1 && monitor.webhook_url) {
    try {
      const color = type === 'down' ? 0xef4444 : 0x22c55e;
      const title = type === 'down'
        ? `🔴 ${monitor.name} is DOWN`
        : `🟢 ${monitor.name} is back UP`;
      const desc = type === 'down'
        ? `${monitor.url}\n${errorMessage || 'Unknown error'}`
        : `${monitor.url} is responding again.`;

      await fetch(monitor.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: title,
          embeds: [{
            title,
            description: desc,
            color,
            timestamp: new Date().toISOString(),
            footer: { text: 'LiveDetector' },
          }],
        }),
      });
    } catch { /* webhook is best-effort */ }
  }
}

export async function sendSlowResponseNotification(
  monitorId: string,
  responseTime: number,
  env: Env,
): Promise<void> {
  const monitor = await env.DB.prepare(
    `SELECT m.name, m.url, m.user_id, u.email,
            ns.email_enabled, ns.cooldown_minutes, ns.webhook_url, ns.webhook_enabled,
            ns.slow_threshold_ms, ns.slow_alert_enabled
     FROM monitors m
     JOIN users u ON m.user_id = u.id
     LEFT JOIN notification_settings ns ON u.id = ns.user_id
     WHERE m.id = ?`,
  )
    .bind(monitorId)
    .first<{
      name: string;
      url: string;
      user_id: string;
      email: string;
      email_enabled: number | null;
      cooldown_minutes: number | null;
      webhook_url: string | null;
      webhook_enabled: number | null;
      slow_threshold_ms: number | null;
      slow_alert_enabled: number | null;
    }>();

  if (!monitor) return;
  if (monitor.slow_alert_enabled !== 1 || !monitor.slow_threshold_ms) return;
  if (responseTime <= monitor.slow_threshold_ms) return;
  if (monitor.email_enabled === 0) return;

  const cooldownMinutes = monitor.cooldown_minutes || 15;
  const recentNotification = await env.DB.prepare(
    `SELECT id FROM notification_log
     WHERE monitor_id = ? AND type = 'slow' AND sent_at > datetime('now', '-' || ? || ' minutes')
     LIMIT 1`,
  )
    .bind(monitorId, cooldownMinutes)
    .first();

  if (recentNotification) return;

  const subject = `[SLOW] ${monitor.name} yavaş yanıt veriyor (${responseTime}ms)`;
  const html = buildSlowResponseEmailHtml(monitor.name, monitor.url, responseTime, monitor.slow_threshold_ms);

  const sent = await sendEmail({ to: monitor.email, subject, html }, env.RESEND_API_KEY);

  if (sent) {
    await env.DB.prepare(
      `INSERT INTO notification_log (id, user_id, monitor_id, type)
       VALUES (?, ?, ?, 'slow')`,
    )
      .bind(crypto.randomUUID(), monitor.user_id, monitorId)
      .run();
  }

  if (monitor.webhook_enabled === 1 && monitor.webhook_url) {
    try {
      const title = `🟡 ${monitor.name} is SLOW (${responseTime}ms)`;
      await fetch(monitor.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: title,
          embeds: [{
            title,
            description: `${monitor.url}\nResponse time: ${responseTime}ms (threshold: ${monitor.slow_threshold_ms}ms)`,
            color: 0xf59e0b,
            timestamp: new Date().toISOString(),
            footer: { text: 'LiveDetector' },
          }],
        }),
      });
    } catch { /* webhook is best-effort */ }
  }
}
