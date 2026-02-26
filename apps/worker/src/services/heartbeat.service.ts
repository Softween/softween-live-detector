import { MAX_HEARTBEATS_PER_USER } from 'shared';
import type { HeartbeatMonitor } from 'shared';
import type { Env } from '../env';

export async function listHeartbeats(env: Env, userId: string): Promise<HeartbeatMonitor[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM heartbeat_monitors WHERE user_id = ? ORDER BY created_at DESC',
  ).bind(userId).all<HeartbeatMonitor>();
  return result.results;
}

export async function createHeartbeat(
  env: Env,
  userId: string,
  data: { name: string; expected_interval_seconds: number; grace_period_seconds: number },
): Promise<HeartbeatMonitor> {
  const count = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM heartbeat_monitors WHERE user_id = ?',
  ).bind(userId).first<{ count: number }>();

  if (count && count.count >= MAX_HEARTBEATS_PER_USER) {
    throw new Error(`Maksimum ${MAX_HEARTBEATS_PER_USER} heartbeat monitör ekleyebilirsiniz`);
  }

  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, '');

  await env.DB.prepare(
    `INSERT INTO heartbeat_monitors (id, user_id, name, token, expected_interval_seconds, grace_period_seconds)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(id, userId, data.name, token, data.expected_interval_seconds, data.grace_period_seconds).run();

  return (await env.DB.prepare('SELECT * FROM heartbeat_monitors WHERE id = ?').bind(id).first<HeartbeatMonitor>())!;
}

export async function deleteHeartbeat(env: Env, id: string, userId: string): Promise<boolean> {
  const result = await env.DB.prepare(
    'DELETE FROM heartbeat_monitors WHERE id = ? AND user_id = ?',
  ).bind(id, userId).run();
  return result.meta.changes > 0;
}

export async function handleHeartbeatPing(env: Env, token: string, fail?: boolean): Promise<boolean> {
  const hb = await env.DB.prepare(
    'SELECT * FROM heartbeat_monitors WHERE token = ?',
  ).bind(token).first<HeartbeatMonitor>();

  if (!hb) return false;

  if (fail) {
    await env.DB.prepare(
      "UPDATE heartbeat_monitors SET status = 'down', updated_at = datetime('now') WHERE id = ?",
    ).bind(hb.id).run();
  } else {
    await env.DB.prepare(
      "UPDATE heartbeat_monitors SET status = 'up', last_ping_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
    ).bind(hb.id).run();
  }

  return true;
}

export async function checkExpiredHeartbeats(env: Env): Promise<void> {
  // Find heartbeats that haven't been pinged within expected_interval + grace_period
  const expired = await env.DB.prepare(
    `SELECT hb.*, u.email, ns.email_enabled, ns.telegram_enabled, ns.telegram_bot_token, ns.telegram_chat_id
     FROM heartbeat_monitors hb
     JOIN users u ON hb.user_id = u.id
     LEFT JOIN notification_settings ns ON u.id = ns.user_id
     WHERE hb.status != 'down'
       AND hb.last_ping_at IS NOT NULL
       AND datetime(hb.last_ping_at, '+' || (hb.expected_interval_seconds + hb.grace_period_seconds) || ' seconds') < datetime('now')`,
  ).all<HeartbeatMonitor & { email: string; email_enabled: number | null; telegram_enabled: number | null; telegram_bot_token: string | null; telegram_chat_id: string | null }>();

  if (!expired.results || expired.results.length === 0) return;

  for (const hb of expired.results) {
    await env.DB.prepare(
      "UPDATE heartbeat_monitors SET status = 'down', updated_at = datetime('now') WHERE id = ?",
    ).bind(hb.id).run();
  }
}
