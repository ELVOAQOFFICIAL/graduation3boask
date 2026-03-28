import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { logActivity, getClientIp } from '@/lib/activity-log';

export const runtime = 'edge';


// GET /api/admin/export?format=csv|json|txt
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 403 });
  }

  const ip = getClientIp(request);
  const format = request.nextUrl.searchParams.get('format') || 'csv';
  const userId = request.nextUrl.searchParams.get('userId');

  let query = supabaseAdmin
    .from('songs')
    .select(`
      id, song_name, artist, notes, added_after_first_session, created_at,
      users!inner(display_name, username)
    `)
    .order('created_at', { ascending: true });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: songs, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Nepodarilo sa načítať piesne.' }, { status: 500 });
  }

  const rows = (songs || []).map((s: Record<string, unknown>, i: number) => {
    const user = s.users as Record<string, unknown>;
    return {
      num: i + 1,
      songName: s.song_name as string,
      artist: (s.artist as string) || '',
      notes: (s.notes as string) || '',
      submittedBy: (user?.display_name as string) || '',
      createdAt: s.created_at as string,
      session: s.added_after_first_session ? 'Opätovná' : 'Prvá',
    };
  });

  await logActivity({
    eventType: 'admin_export',
    ipAddress: ip,
    metadata: { format, rowCount: rows.length },
  });

  if (format === 'json') {
    return NextResponse.json(rows, {
      headers: {
        'Content-Disposition': 'attachment; filename="piesne-export.json"',
      },
    });
  }

  if (format === 'txt') {
    // Get unique users count
    const uniqueUsers = new Set(rows.map(r => r.submittedBy)).size;
    
    let txt = `PROMOČNÁ PÁRTY — ŽIADOSTI O PIESNE\n`;
    txt += `Vygenerované: ${new Date().toLocaleString('sk-SK')}\n\n`;
    txt += `Celkom: ${rows.length} piesní od ${uniqueUsers} hostí\n\n`;
    txt += `${'─'.repeat(50)}\n`;

    rows.forEach((r) => {
      txt += ` ${r.num}. ${r.songName}`;
      if (r.artist) txt += ` — ${r.artist}`;
      txt += `\n`;
      if (r.notes) txt += `    Poznámka: ${r.notes}\n`;
      txt += `    Od: ${r.submittedBy}\n\n`;
    });

    return new NextResponse(txt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="piesne-export.txt"',
      },
    });
  }

  // CSV (default)
  const header = '#,Názov piesne,Interpret,Poznámky,Pridané od,Dátum pridania,Relácia';
  const csvRows = rows.map((r) => {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [
      r.num,
      escape(r.songName),
      escape(r.artist),
      escape(r.notes),
      escape(r.submittedBy),
      escape(new Date(r.createdAt).toLocaleString('sk-SK')),
      escape(r.session),
    ].join(',');
  });

  const csv = [header, ...csvRows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="piesne-export.csv"',
    },
  });
}
