import { Resend } from 'resend';

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendOtpEmail(to: string, code: string): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) return false;

  try {
    const { error } = await resend.emails.send({
      from: 'noreply@graduation3boask.elvoaq.com',
      to,
      subject: 'Tvoj overovací kód pre Stuzkova',
      text: `Tvoj overovací kód je: ${code}\n\nKód je platný 10 minút.\n\nAk si tento kód nevyžiadal/a, ignoruj tento email.`,
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return false;
  }
}

export async function sendAdminOtpEmail(to: string, code: string): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) return false;

  try {
    const { error } = await resend.emails.send({
      from: 'noreply@graduation3boask.elvoaq.com',
      to,
      subject: 'Admin 2FA kód pre Stuzkova',
      text: `Tvoj admin 2FA kód je: ${code}\n\nKód je platný 10 minút.\n\nAk si tento kód nevyžiadal/a, okamžite zmeň admin heslo.`,
    });

    if (error) {
      console.error('Resend admin OTP error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send admin OTP email:', error);
    return false;
  }
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

  const resend = getResendClient();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: 'noreply@graduation3boask.elvoaq.com',
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
  } catch (error) {
    console.error('Failed to send geo alert:', error);
  }
}
