import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { logActivity, getClientIp } from '@/lib/activity-log';
import { sanitizeText } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';


// GET /api/songs — list all songs (no user attribution for regular users)
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 401 });
  }

  const { data: songs, error } = await supabaseAdmin
    .from('songs')
    .select('id, song_name, artist, notes, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Nepodarilo sa načítať piesne.' }, { status: 500 });
  }

  return NextResponse.json({ songs });
}

// POST /api/songs — submit a new song
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'user') {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 401 });
  }

  const ip = getClientIp(request);

  // Rate limit: 50 songs per day per user
  const limit = rateLimit(`song_submit_${session.userId}`, 50, 24 * 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Dosiahli ste denný limit pridávania piesní.' },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { songName, artist, notes, musicApiId } = body;

  if (!songName || typeof songName !== 'string' || songName.trim().length === 0) {
    return NextResponse.json(
      { error: 'Názov piesne je povinný.' },
      { status: 400 }
    );
  }

  const cleanSongName = sanitizeText(songName).slice(0, 255);
  const cleanArtist = artist ? sanitizeText(artist).slice(0, 255) : null;
  const cleanNotes = notes ? sanitizeText(notes).slice(0, 500) : null;

  if (cleanSongName.length === 0) {
    return NextResponse.json(
      { error: 'Názov piesne je povinný.' },
      { status: 400 }
    );
  }

  // Check if user has had a previous session (for added_after_first_session flag)
  const { data: previousSongs } = await supabaseAdmin
    .from('activity_log')
    .select('id')
    .eq('user_id', session.userId)
    .eq('event_type', 'session_started')
    .limit(2);

  const addedAfterFirstSession = (previousSongs?.length || 0) > 1;

  const { data: song, error } = await supabaseAdmin
    .from('songs')
    .insert({
      user_id: session.userId,
      song_name: cleanSongName,
      artist: cleanArtist,
      notes: cleanNotes,
      music_api_id: musicApiId || null,
      added_after_first_session: addedAfterFirstSession,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Nepodarilo sa pridať pieseň.' }, { status: 500 });
  }

  await logActivity({
    userId: session.userId,
    eventType: 'song_added',
    ipAddress: ip,
    metadata: {
      song_id: song.id,
      song_name: cleanSongName,
      artist: cleanArtist,
      added_after_first_session: addedAfterFirstSession,
    },
  });

  return NextResponse.json({ success: true, song, message: 'Pieseň bola pridaná.' });
}
