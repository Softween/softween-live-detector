import { CRON_BATCH_SIZE, TURKEY_BATCH_SIZE } from 'shared';
import { pingMonitor, type PingResult } from '../services/ping.service';
import { sendStatusNotification, sendSlowResponseNotification } from '../services/notification.service';
import { runCleanup } from '../services/cleanup.service';
import { checkExpiredHeartbeats } from '../services/heartbeat.service';
import { checkSSLExpiry } from '../services/ssl.service';
import { pingTurkeySite } from '../services/turkey-ping.service';
import { seedTurkeySites } from '../services/turkey-seed.service';
import { generateWeeklyBlogContent } from '../services/blog.service';
import type { Env } from '../env';

interface MonitorRow {
  id: string;
  url: string;
  method: string;
  expected_status: number;
  timeout_ms: number;
  current_status: string;
  check_keyword: string | null;
  maintenance_start: string | null;
  maintenance_end: string | null;
  check_interval_seconds: number | null;
  custom_headers: string | null;
  monitor_type: string;
  port: number | null;
}

function isInMaintenance(monitor: MonitorRow): boolean {
  if (!monitor.maintenance_start || !monitor.maintenance_end) return false;
  const now = new Date();
  return now >= new Date(monitor.maintenance_start) && now <= new Date(monitor.maintenance_end);
}

export async function handleScheduled(
  _controller: ScheduledController,
  env: Env,
): Promise<void> {
  // 1. Fetch all active monitors
  const monitors = await env.DB.prepare(
    'SELECT id, url, method, expected_status, timeout_ms, current_status, check_keyword, maintenance_start, maintenance_end, check_interval_seconds, custom_headers, monitor_type, port FROM monitors WHERE is_active = 1',
  ).all<MonitorRow>();

  if (!monitors.results || monitors.results.length === 0) return;

  // Filter out monitors in maintenance window
  const allMonitors = monitors.results.filter((m) => !isInMaintenance(m));

  if (allMonitors.length === 0) return;

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

  // 7. Check for slow responses
  for (const result of results) {
    if (result.status === 'up' && result.responseTime) {
      await sendSlowResponseNotification(result.monitorId, result.responseTime, env);
    }
  }

  // 8. Run daily cleanup
  await runCleanup(env);

  // 9. Check expired heartbeat monitors
  await checkExpiredHeartbeats(env);

  // 10. Run SSL check once per day
  const lastSslCheck = await env.KV.get('cron:last_ssl_check');
  const today = new Date().toISOString().split('T')[0];
  if (lastSslCheck !== today) {
    await checkSSLExpiry(env);
    await env.KV.put('cron:last_ssl_check', today);
  }

  // 11. Turkey site monitoring
  await handleTurkeyChecks(env);

  // 12. Weekly blog generation (runs on Saturdays around 03:00 UTC)
  const now = new Date();
  const lastBlogGen = await env.KV.get('cron:last_blog_gen');
  const weekKey = `${now.getFullYear()}-W${Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000)}`;
  if (lastBlogGen !== weekKey && now.getUTCDay() === 6 && now.getUTCHours() >= 3) {
    await generateWeeklyBlogContent(env);
    await env.KV.put('cron:last_blog_gen', weekKey);
  }
}

async function handleTurkeyChecks(env: Env): Promise<void> {
  // Ensure sites are seeded
  await seedTurkeySites(env);

  const sites = await env.DB.prepare(
    'SELECT id, name, url, current_status FROM turkey_sites WHERE is_active = 1',
  ).all<{ id: string; name: string; url: string; current_status: string }>();

  if (!sites.results.length) return;

  // Round-robin batching
  const offsetStr = await env.KV.get('cron:turkey_offset');
  let offset = offsetStr ? parseInt(offsetStr, 10) : 0;
  if (offset >= sites.results.length) offset = 0;

  const batch = sites.results.slice(offset, offset + TURKEY_BATCH_SIZE);
  const nextOffset = offset + TURKEY_BATCH_SIZE >= sites.results.length ? 0 : offset + TURKEY_BATCH_SIZE;
  await env.KV.put('cron:turkey_offset', String(nextOffset));

  // Ping all sites in batch
  const results = await Promise.all(batch.map((site) => pingTurkeySite(site)));

  // Batch insert checks
  if (results.length > 0) {
    const insertStmt = env.DB.prepare(
      'INSERT INTO turkey_checks (id, site_id, status, status_code, response_time_ms, error_message) VALUES (?, ?, ?, ?, ?, ?)',
    );
    const insertBatch = results.map((r) =>
      insertStmt.bind(crypto.randomUUID(), r.siteId, r.status, r.statusCode, r.responseTime, r.error),
    );
    await env.DB.batch(insertBatch);
  }

  // Batch update site statuses
  const updateStmt = env.DB.prepare(
    "UPDATE turkey_sites SET current_status = ?, last_response_time_ms = ?, last_checked_at = datetime('now') WHERE id = ?",
  );
  const updateBatch = results.map((r) =>
    updateStmt.bind(r.status, r.responseTime, r.siteId),
  );
  await env.DB.batch(updateBatch);

  // Handle status changes - create/resolve incidents
  for (const result of results) {
    if (result.previousStatus === 'up' && result.status === 'down') {
      await env.DB.prepare(
        'INSERT INTO turkey_incidents (id, site_id, cause) VALUES (?, ?, ?)',
      )
        .bind(crypto.randomUUID(), result.siteId, result.error)
        .run();
    } else if (result.previousStatus === 'down' && result.status === 'up') {
      await env.DB.prepare(
        "UPDATE turkey_incidents SET resolved_at = datetime('now') WHERE site_id = ? AND resolved_at IS NULL",
      )
        .bind(result.siteId)
        .run();
    }
  }
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
