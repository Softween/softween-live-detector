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
        from: 'Softween Live Checker <alerts@softween.com>',
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
      <p style="color: #6b7280; font-size: 12px;">Softween Live Checker</p>
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
      <p style="color: #6b7280; font-size: 12px;">Softween Live Checker</p>
    </div>
  `;
}
