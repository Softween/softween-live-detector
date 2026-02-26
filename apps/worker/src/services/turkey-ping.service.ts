import { TURKEY_CHECK_TIMEOUT_MS } from 'shared';

interface TurkeySiteRow {
  id: string;
  name: string;
  url: string;
  current_status: string;
}

export interface TurkeyPingResult {
  siteId: string;
  status: 'up' | 'down';
  statusCode: number | null;
  responseTime: number | null;
  error: string | null;
  previousStatus: string;
}

export async function pingTurkeySite(site: TurkeySiteRow): Promise<TurkeyPingResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TURKEY_CHECK_TIMEOUT_MS);

    const response = await fetch(site.url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'LiveDetector/1.0 (+https://livedetector.softween.com)',
      },
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - start;
    const isUp = response.status >= 200 && response.status < 400;

    return {
      siteId: site.id,
      status: isUp ? 'up' : 'down',
      statusCode: response.status,
      responseTime,
      error: isUp ? null : `HTTP ${response.status}`,
      previousStatus: site.current_status,
    };
  } catch (err: unknown) {
    return {
      siteId: site.id,
      status: 'down',
      statusCode: null,
      responseTime: Date.now() - start,
      error: err instanceof Error ? err.message : 'Connection failed',
      previousStatus: site.current_status,
    };
  }
}
