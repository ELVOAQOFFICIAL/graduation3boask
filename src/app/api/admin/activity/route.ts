import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';

export const runtime = 'edge';


// GET /api/admin/activity — activity log with filters
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const eventType = params.get('eventType');
  const userId = params.get('userId');
  const country = params.get('country');
  const page = parseInt(params.get('page') || '1');
  const limit = Math.min(parseInt(params.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('activity_log')
    .select('*, users(display_name, username)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (eventType) {
    query = query.eq('event_type', eventType);
  }
  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (country) {
    query = query.eq('country_code', country);
  }

  const { data: logs, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Nepodarilo sa načítať logy.' }, { status: 500 });
  }

  return NextResponse.json({
    logs: logs || [],
    total: count || 0,
    page,
    limit,
  });
}
