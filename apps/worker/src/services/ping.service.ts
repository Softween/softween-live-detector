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

export async function pingMonitor(monitor: MonitorRow): Promise<PingResult> {
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
        const tcpResponse = await fetch(tcpUrl, {
          method: 'HEAD',
          signal: controller.signal,
          headers: { 'User-Agent': 'SoftweenLiveChecker/1.0', ...extraHeaders },
        });
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

    const response = await fetch(monitor.url, {
      method: monitor.method || 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SoftweenLiveChecker/1.0',
        ...extraHeaders,
      },
      redirect: 'follow',
    });

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
