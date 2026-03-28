import { supabaseAdmin } from '@/lib/supabase/server';

export type EventType =
  | 'login_attempt'
  | 'login_success'
  | 'login_blocked'
  | 'otp_requested'
  | 'otp_validated'
  | 'session_started'
  | 'session_ended'
  | 'password_set'
  | 'song_added'
  | 'song_deleted'
  | 'admin_login'
  | 'admin_export'
  | 'failed_login_block';

interface LogParams {
  userId?: string | null;
  eventType: EventType;
  success?: boolean;
  ipAddress?: string | null;
  countryCode?: string | null;
  city?: string | null;
  userAgent?: string | null;
  geoAlert?: boolean;
  metadata?: Record<string, unknown>;
}

export async function logActivity(params: LogParams) {
  try {
    await supabaseAdmin.from('activity_log').insert({
      user_id: params.userId || null,
      event_type: params.eventType,
      success: params.success ?? null,
      ip_address: params.ipAddress || null,
      country_code: params.countryCode || null,
      city: params.city || null,
      user_agent: params.userAgent || null,
      geo_alert: params.geoAlert || false,
      metadata: params.metadata || null,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}
