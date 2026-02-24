import { CRON_BATCH_SIZE } from 'shared';
import { pingMonitor, type PingResult } from '../services/ping.service';
import { sendStatusNotification } from '../services/notification.service';
import { runCleanup } from '../services/cleanup.service';
import type { Env } from '../env';

interface MonitorRow {
  id: string;
  url: string;
  method: string;
  expected_status: number;
  timeout_ms: number;
  current_status: string;
}

export async function handleScheduled(
  _controller: ScheduledController,
  env: Env,
): Promise<void> {
  // 1. Fetch all active monitors
  const monitors = await env.DB.prepare(
    'SELECT id, url, method, expected_status, timeout_ms, current_status FROM monitors WHERE is_active = 1',
  ).all<MonitorRow>();

  if (!monitors.results || monitors.results.length === 0) return;

  const allMonitors = monitors.results;

  // 2. Round-robin batch to stay within subrequest limits
  const offsetKey = 'cron:monitor_offset';
  const currentOffset = parseInt((await env.KV.get(offsetKey)) || '0', 10);
  const batch = allMonitors.slice(currentOffset, currentOffset + CRON_BATCH_SIZE);

  // Update offset for next run
  const nextOffset =
    currentOffset + CRON_BATCH_SIZE >= allMonitors.length
      ? 0
      : currentOffset + CRON_BATCH_SIZE;
  await env.KV.put(offsetKey, String(nextOffset));

  if (batch.length === 0) return;

  // 3. Ping all monitors in parallel
  const results = await Promise.all(batch.map((monitor) => pingMonitor(monitor)));

  // 4. Batch insert check results
  const insertStatements = results.map((result) =>
    env.DB.prepare(
      `INSERT INTO checks (id, monitor_id, status, status_code, response_time_ms, error_message)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(
      result.id,
      result.monitorId,
      result.status,
      result.statusCode,
      result.responseTime,
      result.error,
    ),
  );

  // 5. Batch update monitor statuses
  const updateStatements = results.map((result) =>
    env.DB.prepare(
      "UPDATE monitors SET current_status = ?, last_checked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
    ).bind(result.status, result.monitorId),
  );

  await env.DB.batch([...insertStatements, ...updateStatements]);

  // 6. Handle status changes (incidents + notifications)
  const statusChanges = results.filter((r) => r.statusChanged);
  for (const change of statusChanges) {
    await handleStatusChange(change, env);
  }

  // 7. Run daily cleanup
  await runCleanup(env);
}

async function handleStatusChange(change: PingResult, env: Env): Promise<void> {
  if (change.status === 'down' && change.previousStatus === 'up') {
    // Site went down - create incident
    await env.DB.prepare(
      'INSERT INTO incidents (id, monitor_id, cause) VALUES (?, ?, ?)',
    )
      .bind(crypto.randomUUID(), change.monitorId, change.error)
      .run();

    await sendStatusNotification(change.monitorId, 'down', change.error, env);
  } else if (change.status === 'up' && change.previousStatus === 'down') {
    // Site recovered - resolve incident
    await env.DB.prepare(
      "UPDATE incidents SET resolved_at = datetime('now') WHERE monitor_id = ? AND resolved_at IS NULL",
    )
      .bind(change.monitorId)
      .run();

    await sendStatusNotification(change.monitorId, 'up', null, env);
  }
}
