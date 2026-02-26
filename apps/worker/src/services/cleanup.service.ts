import { DATA_RETENTION_DAYS, NOTIFICATION_LOG_RETENTION_DAYS, TURKEY_DATA_RETENTION_DAYS } from 'shared';
import type { Env } from '../env';

export async function runCleanup(env: Env): Promise<void> {
  // Check if cleanup already ran today
  const cleanupKey = 'cron:last_cleanup';
  const lastCleanup = await env.KV.get(cleanupKey);
  const today = new Date().toISOString().split('T')[0];

  if (lastCleanup === today) return;

  await env.DB.batch([
    env.DB.prepare(
      `DELETE FROM checks WHERE checked_at < datetime('now', '-${DATA_RETENTION_DAYS} days')`,
    ),
    env.DB.prepare(
      `DELETE FROM notification_log WHERE sent_at < datetime('now', '-${NOTIFICATION_LOG_RETENTION_DAYS} days')`,
    ),
    env.DB.prepare(
      `DELETE FROM turkey_checks WHERE checked_at < datetime('now', '-${TURKEY_DATA_RETENTION_DAYS} days')`,
    ),
    env.DB.prepare(
      `DELETE FROM trends_cache WHERE fetched_at < datetime('now', '-${TURKEY_DATA_RETENTION_DAYS} days')`,
    ),
  ]);

  await env.KV.put(cleanupKey, today);
}
