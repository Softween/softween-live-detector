import { sendViaGmail, isGmailConfigured } from './gmail';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface GmailEnv {
  GMAIL_CLIENT_EMAIL?: string;
  GMAIL_PRIVATE_KEY?: string;
  GMAIL_SENDER_EMAIL?: string;
}

// Circuit breaker (in-memory, resets on worker restart)
let failCount = 0;
let openedAt = 0;
const FAIL_THRESHOLD = 3;
const COOLDOWN_MS = 60_000;

function isCircuitOpen(): boolean {
  if (failCount < FAIL_THRESHOLD) return false;
  if (Date.now() - openedAt >= COOLDOWN_MS) {
    failCount = 0; // half-open: try again
    return false;
  }
  return true;
}

/**
 * Send an email via Gmail REST API.
 *
 * @param params  - to, subject, html
 * @param _apiKey - DEPRECATED (kept for backward compat, unused)
 * @param env     - Worker env with GMAIL_CLIENT_EMAIL, GMAIL_PRIVATE_KEY, GMAIL_SENDER_EMAIL
 */
export async function sendEmail(params: SendEmailParams, _apiKey: string, env?: GmailEnv): Promise<boolean> {
  if (!env || !isGmailConfigured(env)) {
    console.error('Gmail not configured for email sending');
    return false;
  }

  if (isCircuitOpen()) {
    console.error('Gmail circuit breaker open — skipping send');
    return false;
  }

  try {
    await sendViaGmail(env, {
      to: params.to,
      subject: params.subject,
      html: params.html,
      from: `LiveDetector <${env.GMAIL_SENDER_EMAIL}>`,
    });
    failCount = 0;
    return true;
  } catch (err) {
    failCount++;
    openedAt = Date.now();
    console.error('Gmail send failed:', err);
    return false;
  }
}

export function buildDownEmailHtml(monitorName: string, monitorUrl: string, error: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Site Down Bildirimi</h2>
      <p><strong>${monitorName}</strong> sitesi erişilemez durumda.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">URL</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${monitorUrl}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Hata</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${error}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Zaman</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date().toISOString()}</td></tr>
      </table>
      <p style="color: #6b7280; font-size: 12px;">LiveDetector</p>
    </div>
  `;
}

export function buildUpEmailHtml(monitorName: string, monitorUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Site Tekrar Aktif</h2>
      <p><strong>${monitorName}</strong> sitesi tekrar erişilebilir durumda.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">URL</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${monitorUrl}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Zaman</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date().toISOString()}</td></tr>
      </table>
      <p style="color: #6b7280; font-size: 12px;">LiveDetector</p>
    </div>
  `;
}

export function buildPasswordResetEmailHtml(resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">Şifre Sıfırlama</h2>
      <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın. Bu link 1 saat geçerlidir.</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${resetUrl}" style="background: #7c3aed; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Şifremi Sıfırla</a>
      </div>
      <p style="color: #6b7280; font-size: 13px;">Bu linki kopyalayıp tarayıcınıza yapıştırabilirsiniz:</p>
      <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${resetUrl}</p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Bu talebi siz yapmadıysanız bu emaili görmezden gelebilirsiniz.</p>
      <p style="color: #6b7280; font-size: 12px;">LiveDetector</p>
    </div>
  `;
}

export function buildEmailVerificationHtml(verifyUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">Email Doğrulama</h2>
      <p>Hesabınızı doğrulamak için aşağıdaki butona tıklayın.</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${verifyUrl}" style="background: #7c3aed; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Emailimi Doğrula</a>
      </div>
      <p style="color: #6b7280; font-size: 13px;">Bu linki kopyalayıp tarayıcınıza yapıştırabilirsiniz:</p>
      <p style="color: #6b7280; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
      <p style="color: #6b7280; font-size: 12px;">LiveDetector</p>
    </div>
  `;
}

export function buildSlowResponseEmailHtml(monitorName: string, monitorUrl: string, responseTime: number, threshold: number): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Yavaş Yanıt Uyarısı</h2>
      <p><strong>${monitorName}</strong> sitesi normalden yavaş yanıt veriyor.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">URL</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${monitorUrl}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Yanıt Süresi</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${responseTime}ms</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Eşik Değeri</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${threshold}ms</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Zaman</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date().toISOString()}</td></tr>
      </table>
      <p style="color: #6b7280; font-size: 12px;">LiveDetector</p>
    </div>
  `;
}
