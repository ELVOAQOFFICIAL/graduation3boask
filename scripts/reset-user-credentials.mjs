import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const COST_FACTOR = 12;

const oldUsernames = [
  'rebeka.adamcova',
  'nina.babeckova',
  'zuzana.barutova',
  'ema.drozdova',
  'leon.elias',
  'dominik.folajtar',
  'sofia.heckova',
  'nela.hrdlicova',
  'ljubka.jankovicova',
  'nina.kanovicova',
  'nikola.kastakova',
  'jakub.kriska',
  'dominika.mala',
  'natalia.misovicova',
  'samuel.penyak',
  'lea.porubska',
  'alan.pucik',
  'vanesa.radosinska',
  'lukas.rajnic',
  'viktoria.rosinecova',
  'romana.sedlakova',
  'martin.seewald',
  'simona.slobodova',
  'katarina.stankovenova',
  'sona.svetlikova',
  'nela.sikova',
  'sara.sikova',
  'sara.zahradnikova',
  'dominika.zakova',
  'maximilian.zitnansky',
];

function newUsername(index) {
  return `graduationstuzkova3bmusic.${String(index + 1).padStart(2, '0')}`;
}

function newPassword(index) {
  return `GraduationStuzkova3BMusic!${String(index + 1).padStart(2, '0')}#`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const credentialRows = [];

  for (let i = 0; i < oldUsernames.length; i++) {
    const oldUsername = oldUsernames[i];
    const username = newUsername(i);
    const password = newPassword(i);
    const passwordHash = await bcrypt.hash(password, COST_FACTOR);

    const { error } = await supabase
      .from('users')
      .update({
        username,
        password_hash: passwordHash,
        first_name: '',
        last_name: '',
        email: null,
        identity_confirmed: false,
        last_login_at: null,
      })
      .eq('username', oldUsername);

    if (error) {
      throw new Error(`Failed to update ${oldUsername}: ${error.message}`);
    }

    credentialRows.push({ username, password });
  }

  console.log('Updated user credentials successfully.');
  console.log('Username,Password');
  credentialRows.forEach((row) => {
    console.log(`${row.username},${row.password}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
