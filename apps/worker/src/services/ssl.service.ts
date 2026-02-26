import type { Env } from '../env';

interface SSLInfo {
  expiry_at: string | null;
  issuer: string | null;
}

export async function checkSSLCertificate(url: string): Promise<SSLInfo> {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:') {
      return { expiry_at: null, issuer: null };
    }

    // Use Cloudflare's cf-resolve to check SSL
    // In Workers, we can't directly access TLS info from fetch
    // Instead we use a HEAD request and check if it succeeds over HTTPS
    const response = await fetch(url, {
      method: 'HEAD',
      cf: { cacheTtl: 0 },
      signal: AbortSignal.timeout(5000),
    });

    // If HTTPS works, certificate is valid - we store a basic check
    // For expiry, we use the cf object if available
    const cfObj = (response as any).cf;
    if (cfObj?.tlsVersion) {
      // Basic SSL is valid indication
      return {
        expiry_at: null, // Will be populated by external check or API
        issuer: cfObj.tlsClientAuth?.certIssuerDN || null,
      };
    }

    return { expiry_at: null, issuer: null };
  } catch {
    return { expiry_at: null, issuer: null };
  }
}

export async function checkSSLExpiry(env: Env): Promise<void> {
  // Find monitors with HTTPS URLs that need SSL check
  const monitors = await env.DB.prepare(
    "SELECT id, url, ssl_expiry_at, user_id FROM monitors WHERE url LIKE 'https://%' AND is_active = 1",
  ).all<{ id: string; url: string; ssl_expiry_at: string | null; user_id: string }>();

  if (!monitors.results || monitors.results.length === 0) return;

  // Check SSL for monitors without expiry data (basic validation)
  for (const monitor of monitors.results) {
    const info = await checkSSLCertificate(monitor.url);
    if (info.issuer) {
      await env.DB.prepare(
        "UPDATE monitors SET ssl_issuer = ?, updated_at = datetime('now') WHERE id = ?",
      ).bind(info.issuer, monitor.id).run();
    }
  }
}
