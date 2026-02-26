import { MAX_MONITORS_PER_USER } from 'shared';
import type { Monitor } from 'shared';
import type { Env } from '../env';

export async function listMonitors(env: Env, userId: string): Promise<Monitor[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM monitors WHERE user_id = ? ORDER BY created_at DESC',
  )
    .bind(userId)
    .all<Monitor>();

  return result.results;
}

export async function getMonitor(
  env: Env,
  monitorId: string,
  userId: string,
): Promise<Monitor | null> {
  return env.DB.prepare('SELECT * FROM monitors WHERE id = ? AND user_id = ?')
    .bind(monitorId, userId)
    .first<Monitor>();
}

export async function createMonitor(
  env: Env,
  userId: string,
  data: {
    name: string;
    url: string;
    method: string;
    expected_status: number;
    timeout_ms: number;
    check_keyword?: string;
    check_interval_seconds?: number;
    custom_headers?: string;
    monitor_type?: string;
    port?: number;
    check_regions?: string;
  },
): Promise<Monitor> {
  // Check monitor limit
  const countResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM monitors WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ count: number }>();

  if (countResult && countResult.count >= MAX_MONITORS_PER_USER) {
    throw new Error(`Maksimum ${MAX_MONITORS_PER_USER} monitör ekleyebilirsiniz`);
  }

  const id = crypto.randomUUID();
  const keyword = data.check_keyword || null;

  await env.DB.prepare(
    `INSERT INTO monitors (id, user_id, name, url, method, expected_status, timeout_ms, check_keyword, check_interval_seconds, custom_headers, monitor_type, port, check_regions)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      userId,
      data.name,
      data.url,
      data.method,
      data.expected_status,
      data.timeout_ms,
      keyword,
      data.check_interval_seconds || 60,
      data.custom_headers || null,
      data.monitor_type || 'http',
      data.port || null,
      data.check_regions || null,
    )
    .run();

  return (await env.DB.prepare('SELECT * FROM monitors WHERE id = ?').bind(id).first<Monitor>())!;
}

export async function updateMonitor(
  env: Env,
  monitorId: string,
  userId: string,
  data: Partial<{
    name: string;
    url: string;
    method: string;
    expected_status: number;
    timeout_ms: number;
    check_keyword: string | null;
    maintenance_start: string | null;
    maintenance_end: string | null;
    check_interval_seconds: number;
    custom_headers: string | null;
    monitor_type: string;
    port: number | null;
    check_regions: string | null;
  }>,
): Promise<Monitor | null> {
  const existing = await getMonitor(env, monitorId, userId);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    fields.push('name = ?');
    values.push(data.name);
  }
  if (data.url !== undefined) {
    fields.push('url = ?');
    values.push(data.url);
  }
  if (data.method !== undefined) {
    fields.push('method = ?');
    values.push(data.method);
  }
  if (data.expected_status !== undefined) {
    fields.push('expected_status = ?');
    values.push(data.expected_status);
  }
  if (data.timeout_ms !== undefined) {
    fields.push('timeout_ms = ?');
    values.push(data.timeout_ms);
  }
  if (data.check_keyword !== undefined) {
    fields.push('check_keyword = ?');
    values.push(data.check_keyword || null);
  }
  if (data.maintenance_start !== undefined) {
    fields.push('maintenance_start = ?');
    values.push(data.maintenance_start || null);
  }
  if (data.maintenance_end !== undefined) {
    fields.push('maintenance_end = ?');
    values.push(data.maintenance_end || null);
  }
  if (data.check_interval_seconds !== undefined) {
    fields.push('check_interval_seconds = ?');
    values.push(data.check_interval_seconds);
  }
  if (data.custom_headers !== undefined) {
    fields.push('custom_headers = ?');
    values.push(data.custom_headers || null);
  }
  if (data.monitor_type !== undefined) {
    fields.push('monitor_type = ?');
    values.push(data.monitor_type);
  }
  if (data.port !== undefined) {
    fields.push('port = ?');
    values.push(data.port);
  }
  if (data.check_regions !== undefined) {
    fields.push('check_regions = ?');
    values.push(data.check_regions || null);
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now')");
  values.push(monitorId, userId);

  await env.DB.prepare(
    `UPDATE monitors SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
  )
    .bind(...values)
    .run();

  return getMonitor(env, monitorId, userId);
}

export async function deleteMonitor(
  env: Env,
  monitorId: string,
  userId: string,
): Promise<boolean> {
  const result = await env.DB.prepare(
    'DELETE FROM monitors WHERE id = ? AND user_id = ?',
  )
    .bind(monitorId, userId)
    .run();

  return result.meta.changes > 0;
}

export async function toggleMonitor(
  env: Env,
  monitorId: string,
  userId: string,
  isActive: boolean,
): Promise<Monitor | null> {
  const existing = await getMonitor(env, monitorId, userId);
  if (!existing) return null;

  await env.DB.prepare(
    "UPDATE monitors SET is_active = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
  )
    .bind(isActive ? 1 : 0, monitorId, userId)
    .run();

  return getMonitor(env, monitorId, userId);
}

export function isInMaintenanceWindow(monitor: Monitor): boolean {
  if (!monitor.maintenance_start || !monitor.maintenance_end) return false;
  const now = new Date();
  const start = new Date(monitor.maintenance_start);
  const end = new Date(monitor.maintenance_end);
  return now >= start && now <= end;
}
