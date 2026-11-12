export interface PingResult {
  id: string;
  monitorId: string;
  status: 'up' | 'down';
  statusCode: number | null;
  responseTime: number | null;
  error: string | null;
  previousStatus: string;
  statusChanged: boolean;
}

interface MonitorRow {
  id: string;
  url: string;
  method: string;
  expected_status: number;
  timeout_ms: number;
  current_status: string;
  check_keyword: string | null;
  custom_headers: string | null;
  monitor_type: string;
  port: number | null;
}

interface CheckerInit {
  method: string;
  signal: AbortSignal;
  headers: Record<string, string>;
  redirect?: string;
}

// glossgo's WAF lets the checker past bot protection on partner and admin only when this header
// carries the shared secret (Worker secret SRE_PROBE_HEADER_SECRET). It goes to exactly these hosts,
// decided per redirect hop, so it never follows a redirect elsewhere (admin redirects to Cloudflare Access).
const PROBE_HEADER = 'X-SRE-Probe';
const PROBE_HEADER_HOSTS: ReadonlySet<string> = new Set(['partner.glossgo.com', 'admin.glossgo.com']);
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

function isProbeHost(url: string): boolean {
  try {
    return PROBE_HEADER_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function probeHeaders(url: string, secret: string | undefined): Record<string, string> {
  return secret && isProbeHost(url) ? { [PROBE_HEADER]: secret } : {};
}

// Every other host keeps the plain fetch. With the probe header, redirects are followed by hand so the
// header is decided again from each hop's own URL.
async function checkerFetch(url: string, init: CheckerInit, probeSecret: string | undefined): Promise<Response> {
  if (!probeSecret || !isProbeHost(url)) return fetch(url, init);
  let current = url;
  let method = init.method;
  for (let hop = 0; ; hop++) {
    const response = await fetch(current, {
      ...init,
      method,
      headers: { ...init.headers, ...probeHeaders(current, probeSecret) },
      redirect: 'manual',
    });
    const location = response.headers.get('location');
    if (!REDIRECT_STATUSES.has(response.status) || location === null) return response;
    if (hop === MAX_REDIRECTS) throw new Error('Too many redirects');
    response.body?.cancel().catch(() => {});
    // Same rule as fetch's own redirect handling: a 303, or a 301/302 after a POST, continues as a GET.
    const toGet =
      (response.status === 303 && method !== 'HEAD') ||
      ((response.status === 301 || response.status === 302) && method === 'POST');
    if (toGet) method = 'GET';
    current = new URL(location, current).toString();
  }
}

// livedetector is a public platform: a user's monitor on partner or admin must not carry the secret, or it
// would skip glossgo.com's bot, anti-scraper and anti-farm rules. Only glossgo's own partner monitor gets it.
export const PROBE_MONITOR_IDS: ReadonlySet<string> = new Set(['cc47cfbe-daa9-471e-a36e-2a0be1b3dcc9']);

export async function pingMonitor(monitor: MonitorRow, probeSecret?: string): Promise<PingResult> {
  const secret = PROBE_MONITOR_IDS.has(monitor.id) ? probeSecret : undefined;
  const id = crypto.randomUUID();
  const startTime = Date.now();

  try {
    let extraHeaders: Record<string, string> = {};
    if (monitor.custom_headers) {
      try { extraHeaders = JSON.parse(monitor.custom_headers); } catch {}
    }

    // TCP monitoring: use fetch to the URL with port as a basic connectivity test
    if (monitor.monitor_type === 'tcp') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), monitor.timeout_ms || 10000);

      let tcpUrl = monitor.url;
      if (monitor.port) {
        const urlObj = new URL(monitor.url);
        urlObj.port = String(monitor.port);
        tcpUrl = urlObj.toString();
      }

      try {
        const tcpResponse = await checkerFetch(tcpUrl, {
          method: 'HEAD',
          signal: controller.signal,
          headers: { 'User-Agent': 'SoftweenLiveChecker/1.0', ...extraHeaders },
        }, secret);
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        return {
          id,
          monitorId: monitor.id,
          status: 'up',
          statusCode: tcpResponse.status,
          responseTime,
          error: null,
          previousStatus: monitor.current_status,
          statusChanged:
            monitor.current_status !== 'unknown' && 'up' !== monitor.current_status,
        };
      } catch (tcpErr: unknown) {
        clearTimeout(timeoutId);
        const message = tcpErr instanceof Error ? tcpErr.message : 'TCP connection failed';
        return {
          id,
          monitorId: monitor.id,
          status: 'down',
          statusCode: null,
          responseTime: null,
          error: message,
          previousStatus: monitor.current_status,
          statusChanged: monitor.current_status === 'up',
        };
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), monitor.timeout_ms || 10000);

    const response = await checkerFetch(monitor.url, {
      method: monitor.method || 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SoftweenLiveChecker/1.0',
        ...extraHeaders,
      },
      redirect: 'follow',
    }, secret);

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    const statusMatch = response.status === (monitor.expected_status || 200);

    // Keyword check: if keyword is set and method is GET, read body and check
    let keywordMatch = true;
    if (monitor.check_keyword && monitor.method !== 'HEAD' && statusMatch) {
      try {
        const body = await response.text();
        keywordMatch = body.includes(monitor.check_keyword);
      } catch {
        keywordMatch = false;
      }
    }

    const isUp = statusMatch && keywordMatch;
    let errorMsg: string | null = null;
    if (!statusMatch) {
      errorMsg = `Unexpected status: ${response.status}`;
    } else if (!keywordMatch) {
      errorMsg = `Keyword not found: "${monitor.check_keyword}"`;
    }

    return {
      id,
      monitorId: monitor.id,
      status: isUp ? 'up' : 'down',
      statusCode: response.status,
      responseTime,
      error: errorMsg,
      previousStatus: monitor.current_status,
      statusChanged:
        monitor.current_status !== 'unknown' &&
        (isUp ? 'up' : 'down') !== monitor.current_status,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    return {
      id,
      monitorId: monitor.id,
      status: 'down',
      statusCode: null,
      responseTime: null,
      error: message,
      previousStatus: monitor.current_status,
      statusChanged: monitor.current_status === 'up',
    };
  }
}
