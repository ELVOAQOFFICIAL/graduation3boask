import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyTurnstile } from '@/lib/auth/turnstile';
import { verifyLayerCookie, setLayerCookie } from '@/lib/auth/layers';
import { logActivity, getClientIp } from '@/lib/activity-log';
import { normalizeText, sanitizeText } from '@/lib/utils';

export const runtime = 'edge';


export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || '';

  // Verify Layer 1 cookie
  const layer1 = await verifyLayerCookie(1);
  if (!layer1) {
    return NextResponse.json(
      { error: 'Najprv dokončite prvý krok prihlásenia.' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { firstName, lastName, turnstileToken } = body;

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: 'Zadajte meno a priezvisko.' },
      { status: 400 }
    );
  }

  // Verify Turnstile
  const turnstileValid = await verifyTurnstile(turnstileToken || '');
  if (!turnstileValid) {
    return NextResponse.json(
      { error: 'Overenie CAPTCHA zlyhalo. Skúste znova.' },
      { status: 400 }
    );
  }

  const cleanFirst = sanitizeText(firstName);
  const cleanLast = sanitizeText(lastName);
  const normFirst = normalizeText(cleanFirst);
  const normLast = normalizeText(cleanLast);

  // Look up in allowed_names linked to this user
  const { data: allowedNames } = await supabaseAdmin
    .from('allowed_names')
    .select('id, first_name, last_name, user_id')
    .eq('user_id', layer1.userId);

  // Also check unassigned names
  const { data: unassignedNames } = await supabaseAdmin
    .from('allowed_names')
    .select('id, first_name, last_name, user_id')
    .is('user_id', null);

  const allNames = [...(allowedNames || []), ...(unassignedNames || [])];

  const match = allNames.find(
    (n) =>
      normalizeText(n.first_name) === normFirst &&
      normalizeText(n.last_name) === normLast
  );

  if (!match) {
    await logActivity({
      userId: layer1.userId,
      eventType: 'login_attempt',
      success: false,
      ipAddress: ip,
      userAgent,
      metadata: { layer: 2, reason: 'name_mismatch', attempted: `${cleanFirst} ${cleanLast}` },
    });
    return NextResponse.json(
      { error: 'Meno sa nezhoduje s pozvaným hosťom. Skontrolujte zadané údaje.' },
      { status: 401 }
    );
  }

  // Link allowed_name to user if not already linked
  if (!match.user_id) {
    await supabaseAdmin
      .from('allowed_names')
      .update({ user_id: layer1.userId })
      .eq('id', match.id);
  }

  // Update user with confirmed name
  await supabaseAdmin
    .from('users')
    .update({
      first_name: cleanFirst,
      last_name: cleanLast,
      identity_confirmed: true,
    })
    .eq('id', layer1.userId);

  await logActivity({
    userId: layer1.userId,
    eventType: 'login_attempt',
    success: true,
    ipAddress: ip,
    userAgent,
    metadata: { layer: 2 },
  });

  // Set layer 2 cookie
  await setLayerCookie(2, layer1.userId);

  return NextResponse.json({
    success: true,
    nextLayer: 3,
    message: 'Totožnosť overená. Pokračujte emailovým overením.',
  });
}
