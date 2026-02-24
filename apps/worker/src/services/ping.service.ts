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
}

export async function pingMonitor(monitor: MonitorRow): Promise<PingResult> {
  const id = crypto.randomUUID();
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), monitor.timeout_ms || 10000);

    const response = await fetch(monitor.url, {
      method: monitor.method || 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SoftweenLiveChecker/1.0',
      },
      redirect: 'follow',
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    const isUp = response.status === (monitor.expected_status || 200);

    return {
      id,
      monitorId: monitor.id,
      status: isUp ? 'up' : 'down',
      statusCode: response.status,
      responseTime,
      error: isUp ? null : `Unexpected status: ${response.status}`,
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
