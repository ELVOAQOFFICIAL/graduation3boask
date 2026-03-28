import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/activity-log';

export const runtime = 'edge';


// GET /api/music-search?q=... — proxied search to MusicBrainz
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 401 });
  }

  const ip = getClientIp(request);

  // Rate limit: 60 req/min/IP
  const limit = rateLimit(`music_search_${ip}`, 60, 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Príliš veľa vyhľadávaní. Skúste znova o chvíľu.' },
      { status: 429 }
    );
  }

  const query = request.nextUrl.searchParams.get('q');
  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    // Use MusicBrainz API (free, no key required)
    const response = await fetch(
      `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&limit=8&fmt=json`,
      {
        headers: {
          'User-Agent': 'GraduationSongPlatform/1.0 (graduation3boask.elvoaq.com)',
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await response.json();
    const results = (data.recordings || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      songName: r.title,
      artist: ((r['artist-credit'] as Array<{ name: string }>) || [])
        .map((a: { name: string }) => a.name)
        .join(', '),
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
