import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export const runtime = 'edge';


// GET /api/admin/users — all users with status info
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 403 });
  }

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('id, username, first_name, last_name, display_name, email, role, is_active, identity_confirmed, created_at, last_login_at')
    .eq('role', 'user')
    .order('last_name');

  if (error) {
    return NextResponse.json({ error: 'Nepodarilo sa načítať používateľov.' }, { status: 500 });
  }

  // Get song counts per user
  const { data: songs } = await supabaseAdmin
    .from('songs')
    .select('user_id');

  const songCounts: Record<string, number> = {};
  (songs || []).forEach((s) => {
    songCounts[s.user_id] = (songCounts[s.user_id] || 0) + 1;
  });

  // Get session counts per user
  const { data: sessions } = await supabaseAdmin
    .from('activity_log')
    .select('user_id')
    .eq('event_type', 'session_started');

  const sessionCounts: Record<string, number> = {};
  (sessions || []).forEach((s) => {
    if (s.user_id) {
      sessionCounts[s.user_id] = (sessionCounts[s.user_id] || 0) + 1;
    }
  });

  const formatted = (users || []).map((u) => ({
    ...u,
    songCount: songCounts[u.id] || 0,
    sessionCount: sessionCounts[u.id] || 0,
  }));

  return NextResponse.json({ users: formatted });
}
