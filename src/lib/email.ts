const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function getResendApiKey(): string | null {
  return process.env.RESEND_API_KEY ?? process.env.RESEND_KEY ?? null;
}

function getResendFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'noreply-graduation3boask@elvoaq.com';
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    console.error('RESEND_API_KEY is missing.');
    return false;
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getResendFromAddress(),
        to: [params.to],
        subject: params.subject,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('Resend API error:', response.status, body);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to call Resend API:', error);
    return false;
  }
}

export async function sendOtpEmail(to: string, code: string): Promise<boolean> {
  return sendResendEmail({
    to,
    subject: 'Tvoj overovací kód pre Stuzkova',
    text: `Tvoj overovací kód je: ${code}\n\nKód je platný 10 minút.\n\nAk si tento kód nevyžiadal/a, ignoruj tento email.`,
  });
}

export async function sendAdminOtpEmail(to: string, code: string): Promise<boolean> {
  return sendResendEmail({
    to,
    subject: 'Admin 2FA kód pre Stuzkova',
    text: `Tvoj admin 2FA kód je: ${code}\n\nKód je platný 10 minút.\n\nAk si tento kód nevyžiadal/a, okamžite zmeň admin heslo.`,
  });
}

export async function sendGeoAlertEmail(params: {
  displayName: string | null;
  ip: string;
  country: string;
  city: string;
  userAgent: string;
  timestamp: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) return;

  const sent = await sendResendEmail({
    to: adminEmail,
    subject: '⚠️ Promočná platforma — Prihlásenie z mimo Slovenska',
    text: `UPOZORNENIE: Prihlásenie mimo Slovenska

Meno: ${params.displayName || 'Neznámy'}
IP: ${params.ip}
Krajina: ${params.country}
Mesto: ${params.city}
Zariadenie: ${params.userAgent}
Čas: ${params.timestamp}

Skontrolujte aktivitu na admin paneli.`,
  });

  if (!sent) {
    console.error('Failed to send geo alert email.');
  }
}
