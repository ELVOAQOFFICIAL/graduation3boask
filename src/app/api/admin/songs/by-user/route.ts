import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export const runtime = 'edge';


// GET /api/admin/songs/by-user — songs grouped by user
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 403 });
  }

  // Get all users with their songs
  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, username, first_name, last_name, display_name, email, last_login_at')
    .eq('role', 'user')
    .order('last_name');

  if (usersError) {
    return NextResponse.json({ error: 'Nepodarilo sa načítať používateľov.' }, { status: 500 });
  }

  const { data: songs, error: songsError } = await supabaseAdmin
    .from('songs')
    .select('id, user_id, song_name, artist, notes, added_after_first_session, created_at')
    .order('created_at', { ascending: false });

  if (songsError) {
    return NextResponse.json({ error: 'Nepodarilo sa načítať piesne.' }, { status: 500 });
  }

  // Group songs by user
  const grouped = (users || []).map((user) => ({
    id: user.id,
    displayName: user.display_name,
    username: user.username,
    songCount: (songs || []).filter((s) => s.user_id === user.id).length,
    songs: (songs || []).filter((s) => s.user_id === user.id),
  }));

  return NextResponse.json({ users: grouped });
}
