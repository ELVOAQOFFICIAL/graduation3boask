import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export const runtime = 'edge';


// GET /api/songs/mine — list songs submitted by the current user
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 401 });
  }

  const { data: songs, error } = await supabaseAdmin
    .from('songs')
    .select('id, song_name, artist, notes, music_api_id, added_after_first_session, created_at')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Nepodarilo sa načítať vaše piesne.' }, { status: 500 });
  }

  return NextResponse.json({ songs });
}
