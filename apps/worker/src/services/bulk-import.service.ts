import { MAX_MONITORS_PER_USER } from 'shared';
import type { BulkImportResult, SitemapParseResult } from 'shared';
import { setMonitorTags } from './tag.service';
import type { Env } from '../env';

export async function getRemainingMonitorSlots(env: Env, userId: string): Promise<number> {
  const countResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM monitors WHERE user_id = ?',
  )
    .bind(userId)
    .first<{ count: number }>();
  return MAX_MONITORS_PER_USER - (countResult?.count || 0);
}

function extractNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    if (path) {
      return `${hostname}${path}`.slice(0, 100);
    }
    return hostname;
  } catch {
    return url.slice(0, 100);
  }
}

export async function bulkCreateFromUrls(
  env: Env,
  userId: string,
  urls: string[],
  settings: {
    check_interval_seconds?: number;
    timeout_ms?: number;
    group_id?: string | null;
    tag_ids?: string[];
  },
): Promise<BulkImportResult> {
  const remaining = await getRemainingMonitorSlots(env, userId);
  const created: number[] = [];
  const failed: { url: string; error: string }[] = [];
  const createdIds: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    if (created.length >= remaining) {
      failed.push({ url, error: `Monitör limiti aşıldı (max ${MAX_MONITORS_PER_USER})` });
      continue;
    }

    try {
      new URL(url); // Validate URL
      const id = crypto.randomUUID();
      const name = extractNameFromUrl(url);

      await env.DB.prepare(
        `INSERT INTO monitors (id, user_id, name, url, method, expected_status, timeout_ms, check_interval_seconds, monitor_type, group_id)
         VALUES (?, ?, ?, ?, 'GET', 200, ?, ?, 'http', ?)`,
      )
        .bind(
          id,
          userId,
          name,
          url,
          settings.timeout_ms || 10000,
          settings.check_interval_seconds || 300,
          settings.group_id || null,
        )
        .run();

      created.push(i);
      createdIds.push(id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      failed.push({ url, error: message });
    }
  }

  // Assign tags to all created monitors
  if (settings.tag_ids && settings.tag_ids.length > 0 && createdIds.length > 0) {
    for (const monitorId of createdIds) {
      try {
        await setMonitorTags(env, monitorId, userId, settings.tag_ids);
      } catch {
        // Tag assignment failure is non-critical
      }
    }
  }

  return { created: created.length, failed };
}

export async function fetchSitemapUrls(domain: string): Promise<SitemapParseResult> {
  const sitemapUrl = domain.replace(/\/$/, '') + '/sitemap.xml';
  const urls: string[] = [];

  try {
    const response = await fetch(sitemapUrl, {
      headers: { 'User-Agent': 'LiveDetector-Bot/1.0' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Sitemap yüklenemedi: HTTP ${response.status}`);
    }

    const xml = await response.text();

    // Parse <loc> tags from sitemap XML using regex
    const locRegex = /<loc>\s*(https?:\/\/[^<\s]+)\s*<\/loc>/gi;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
      urls.push(match[1]);
    }

    if (urls.length === 0) {
      throw new Error('Sitemap\'da URL bulunamadı');
    }
  } catch (err: unknown) {
    if (err instanceof Error) throw err;
    throw new Error('Sitemap alınamadı');
  }

  return { urls, total: urls.length };
}

export async function bulkCreateFromPathBuilder(
  env: Env,
  userId: string,
  baseUrl: string,
  paths: string[],
  settings: {
    check_interval_seconds?: number;
    timeout_ms?: number;
    group_id?: string | null;
    tag_ids?: string[];
  },
): Promise<BulkImportResult> {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const urls = paths.map((path) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  });

  return bulkCreateFromUrls(env, userId, urls, settings);
}
