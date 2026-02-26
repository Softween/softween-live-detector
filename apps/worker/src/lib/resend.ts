const RESEND_API_URL = 'https://api.resend.com/emails';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LiveDetector <alerts@softween.com>',
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });
    return response.ok;
  } catch {
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
