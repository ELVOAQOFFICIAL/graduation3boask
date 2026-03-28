import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export const runtime = 'edge';


// GET /api/admin/songs — all songs with user attribution
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 403 });
  }

  const { data: songs, error } = await supabaseAdmin
    .from('songs')
    .select(`
      id, song_name, artist, notes, music_api_id,
      added_after_first_session, created_at,
      users!inner(id, display_name, username)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Nepodarilo sa načítať piesne.' }, { status: 500 });
  }

  // Flatten user data
  const formatted = (songs || []).map((s: Record<string, unknown>) => {
    const user = s.users as Record<string, unknown>;
    return {
      id: s.id,
      songName: s.song_name,
      artist: s.artist,
      notes: s.notes,
      addedAfterFirstSession: s.added_after_first_session,
      createdAt: s.created_at,
      submittedBy: user?.display_name || 'Neznámy',
      username: user?.username,
      userId: user?.id,
    };
  });

  return NextResponse.json({ songs: formatted });
}
