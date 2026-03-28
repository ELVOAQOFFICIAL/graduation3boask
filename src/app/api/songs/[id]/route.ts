import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { logActivity, getClientIp } from '@/lib/activity-log';

export const runtime = 'edge';


// DELETE /api/songs/[id] — delete own song
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 401 });
  }

  const { id } = await params;
  const ip = getClientIp(request);

  // Check ownership
  const { data: song } = await supabaseAdmin
    .from('songs')
    .select('id, song_name, artist, user_id')
    .eq('id', id)
    .single();

  if (!song) {
    return NextResponse.json({ error: 'Pieseň nebola nájdená.' }, { status: 404 });
  }

  if (song.user_id !== session.userId) {
    return NextResponse.json({ error: 'Nemáte oprávnenie zmazať túto pieseň.' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('songs')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Nepodarilo sa zmazať pieseň.' }, { status: 500 });
  }

  await logActivity({
    userId: session.userId,
    eventType: 'song_deleted',
    ipAddress: ip,
    metadata: {
      song_id: id,
      song_name: song.song_name,
      artist: song.artist,
    },
  });

  return NextResponse.json({ success: true, message: 'Pieseň bola zmazaná.' });
}
