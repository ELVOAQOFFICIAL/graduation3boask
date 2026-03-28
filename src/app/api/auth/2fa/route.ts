import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 401 });
  }

  if (session.role !== 'user') {
    return NextResponse.json({ error: '2FA nastavenia sú dostupné len pre používateľov.' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('user_security_settings')
    .select('two_factor_enabled')
    .eq('user_id', session.userId)
    .single();

  if (error) {
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({ enabled: Boolean(data?.two_factor_enabled) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Neautorizovaný prístup.' }, { status: 401 });
  }

  if (session.role !== 'user') {
    return NextResponse.json({ error: '2FA nastavenia sú dostupné len pre používateľov.' }, { status: 403 });
  }

  const body = await request.json();
  const enabled = Boolean(body?.enabled);

  const { error } = await supabaseAdmin
    .from('user_security_settings')
    .upsert(
      {
        user_id: session.userId,
        two_factor_enabled: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    return NextResponse.json(
      { error: 'Nepodarilo sa uložiť 2FA nastavenie. Skontrolujte databázovú schému.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, enabled });
}
