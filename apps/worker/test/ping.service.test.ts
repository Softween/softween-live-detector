// Runs on Node's built-in test runner with its TypeScript type stripping: `pnpm --filter worker test`.
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { PROBE_MONITOR_IDS, pingMonitor, probeHeaders } from '../src/services/ping.service.ts';

const [OWN_MONITOR] = PROBE_MONITOR_IDS;

type Monitor = Parameters<typeof pingMonitor>[0];
type Result = Awaited<ReturnType<typeof pingMonitor>>;

interface Hop {
  url: string;
  method: string | undefined;
  probe: string | null;
  custom: string | null;
  redirect: string | undefined;
}

const realFetch = globalThis.fetch;

// Answers every fetch of a test through `route` and records what each request carried.
function stubFetch(route: (url: URL) => Response): Hop[] {
  const hops: Hop[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    hops.push({
      url: String(input),
      method: init?.method,
      probe: headers.get('x-sre-probe'),
      custom: headers.get('x-custom'),
      redirect: init?.redirect,
    });
    return route(new URL(String(input)));
  };
  return hops;
}

function monitor(url: string, overrides: Partial<Monitor> = {}): Monitor {
  return {
    id: OWN_MONITOR,
    url,
    method: 'GET',
    expected_status: 200,
    timeout_ms: 1000,
    current_status: 'up',
    check_keyword: null,
    custom_headers: JSON.stringify({ 'X-Custom': 'kept' }),
    monitor_type: 'http',
    port: null,
    ...overrides,
  };
}

const redirect = (location: string, status = 302) =>
  new Response(null, { status, headers: { location } });

const outcome = ({ status, statusCode, error }: Result) => ({ status, statusCode, error });

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('probeHeaders', () => {
  it('goes only to partner.glossgo.com and admin.glossgo.com, and only with a secret', () => {
    assert.deepEqual(probeHeaders('https://partner.glossgo.com/', 'test-secret'), { 'X-SRE-Probe': 'test-secret' });
    assert.deepEqual(probeHeaders('https://admin.glossgo.com/users?page=2', 'test-secret'), { 'X-SRE-Probe': 'test-secret' });
    for (const url of [
      'https://preprod.partner.glossgo.com/',
      'https://glossgo.com/',
      'https://partner.glossgo.com.example.com/',
      'https://example.com/?next=https://partner.glossgo.com/',
      'https://bilalsengul.cloudflareaccess.com/',
      'not a url',
    ]) {
      assert.deepEqual(probeHeaders(url, 'test-secret'), {}, url);
    }
    assert.deepEqual(probeHeaders('https://partner.glossgo.com/', undefined), {});
    assert.deepEqual(probeHeaders('https://partner.glossgo.com/', ''), {});
  });
});

describe('pingMonitor probe header', () => {
  it('drops the header when admin redirects to Cloudflare Access', async () => {
    const access = 'https://bilalsengul.cloudflareaccess.com/cdn-cgi/access/login/admin.glossgo.com';
    const hops = stubFetch((url) => (url.hostname === 'admin.glossgo.com' ? redirect(access) : new Response('login')));
    const result = await pingMonitor(monitor('https://admin.glossgo.com/'), 'test-secret');
    assert.deepEqual(hops, [
      { url: 'https://admin.glossgo.com/', method: 'GET', probe: 'test-secret', custom: 'kept', redirect: 'manual' },
      { url: access, method: 'GET', probe: null, custom: 'kept', redirect: 'manual' },
    ]);
    assert.deepEqual(outcome(result), { status: 'up', statusCode: 200, error: null });
  });

  it('keeps the header on a same-host redirect and checks the keyword on the final page', async () => {
    const hops = stubFetch((url) => (url.pathname === '/' ? redirect('/tr', 307) : new Response('glossgo Partner')));
    const result = await pingMonitor(monitor('https://partner.glossgo.com/', { check_keyword: 'Partner' }), 'test-secret');
    assert.deepEqual(hops.map((hop) => [hop.url, hop.probe]), [
      ['https://partner.glossgo.com/', 'test-secret'],
      ['https://partner.glossgo.com/tr', 'test-secret'],
    ]);
    assert.deepEqual(outcome(result), { status: 'up', statusCode: 200, error: null });
  });

  it('continues a POST as a GET after a 303, like fetch', async () => {
    const hops = stubFetch((url) => (url.pathname === '/form' ? redirect('/done', 303) : new Response('ok')));
    await pingMonitor(monitor('https://partner.glossgo.com/form', { method: 'POST' }), 'test-secret');
    assert.deepEqual(hops.map((hop) => hop.method), ['POST', 'GET']);
  });

  it('reports a redirect loop as down after five redirects', async () => {
    const hops = stubFetch(() => redirect('/again'));
    const result = await pingMonitor(monitor('https://partner.glossgo.com/'), 'test-secret');
    assert.equal(hops.length, 6);
    assert.deepEqual(outcome(result), { status: 'down', statusCode: null, error: 'Too many redirects' });
  });

  it('sends the header on a TCP check of the host too', async () => {
    const hops = stubFetch(() => new Response(null));
    const result = await pingMonitor(monitor('https://partner.glossgo.com/', { monitor_type: 'tcp', port: 443 }), 'test-secret');
    assert.deepEqual(hops, [
      { url: 'https://partner.glossgo.com/', method: 'HEAD', probe: 'test-secret', custom: 'kept', redirect: 'manual' },
    ]);
    assert.deepEqual(outcome(result), { status: 'up', statusCode: 200, error: null });
  });

  it('never gives the header to another user\'s monitor on partner or admin', async () => {
    const hops = stubFetch(() => new Response('ok'));
    await pingMonitor(monitor('https://partner.glossgo.com/claim', { id: 'someone-else' }), 'test-secret');
    await pingMonitor(monitor('https://admin.glossgo.com/', { id: 'someone-else' }), 'test-secret');
    assert.deepEqual(hops.map((h) => h.probe), [null, null]);
  });

  it('leaves other hosts, and a missing secret, on the plain fetch', async () => {
    const hops = stubFetch(() => new Response('ok'));
    await pingMonitor(monitor('https://www.tesla.com/'), 'test-secret');
    await pingMonitor(monitor('https://preprod.partner.glossgo.com/'), 'test-secret');
    await pingMonitor(monitor('https://partner.glossgo.com/'), undefined);
    assert.deepEqual(hops, [
      { url: 'https://www.tesla.com/', method: 'GET', probe: null, custom: 'kept', redirect: 'follow' },
      { url: 'https://preprod.partner.glossgo.com/', method: 'GET', probe: null, custom: 'kept', redirect: 'follow' },
      { url: 'https://partner.glossgo.com/', method: 'GET', probe: null, custom: 'kept', redirect: 'follow' },
    ]);
  });
});
