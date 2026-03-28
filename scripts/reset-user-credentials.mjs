import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const COST_FACTOR = 12;

// All guests: [firstName, lastName, oldUsername]
const guests = [
  ['Rebeka', 'Adamcová', 'graduationstuzkova3bmusic.01'],
  ['Nina', 'Babečková', 'graduationstuzkova3bmusic.02'],
  ['Zuzana', 'Barutová', 'graduationstuzkova3bmusic.03'],
  ['Ema', 'Drozdová', 'graduationstuzkova3bmusic.04'],
  ['Leon Martin', 'Eliáš', 'graduationstuzkova3bmusic.05'],
  ['Dominik', 'Folajtár', 'graduationstuzkova3bmusic.06'],
  ['Sofia', 'Hečková', 'graduationstuzkova3bmusic.07'],
  ['Nela', 'Hrdlicová', 'graduationstuzkova3bmusic.08'],
  ['Ljubka', 'Jankovičová', 'graduationstuzkova3bmusic.09'],
  ['Nina', 'Kanovičová', 'graduationstuzkova3bmusic.10'],
  ['Nikola', 'Kašťáková', 'graduationstuzkova3bmusic.11'],
  ['Jakub', 'Kriška', 'graduationstuzkova3bmusic.12'],
  ['Dominika', 'Malá', 'graduationstuzkova3bmusic.13'],
  ['Natália', 'Mišovičová', 'graduationstuzkova3bmusic.14'],
  ['Samuel', 'Penyak', 'graduationstuzkova3bmusic.15'],
  ['Lea', 'Porubská', 'graduationstuzkova3bmusic.16'],
  ['Alan', 'Pučík', 'graduationstuzkova3bmusic.17'],
  ['Vanesa', 'Radošinská', 'graduationstuzkova3bmusic.18'],
  ['Lukáš', 'Rajnic', 'graduationstuzkova3bmusic.19'],
  ['Viktória', 'Rosinecová', 'graduationstuzkova3bmusic.20'],
  ['Romana', 'Sedláková', 'graduationstuzkova3bmusic.21'],
  ['Martin', 'Seewald', 'graduationstuzkova3bmusic.22'],
  ['Simona', 'Slobodová', 'graduationstuzkova3bmusic.23'],
  ['Katarína', 'Stankovenová', 'graduationstuzkova3bmusic.24'],
  ['Soňa', 'Svetlíková', 'graduationstuzkova3bmusic.25'],
  ['Nela', 'Šiková', 'graduationstuzkova3bmusic.26'],
  ['Sara', 'Šiková', 'graduationstuzkova3bmusic.27'],
  ['Sára', 'Zahradníková', 'graduationstuzkova3bmusic.28'],
  ['Dominika', 'Žáková', 'graduationstuzkova3bmusic.29'],
  ['Maximilián', 'Žitňanský', 'graduationstuzkova3bmusic.30'],
];

/** Strip diacritics and produce lowercase ASCII string */
function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function newUsername(firstName, lastName) {
  return removeDiacritics(firstName.replace(/\s+/g, '') + lastName.replace(/\s+/g, ''));
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

  for (let i = 0; i < guests.length; i++) {
    const [firstName, lastName, oldUsername] = guests[i];
    const username = newUsername(firstName, lastName);
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

    credentialRows.push({ firstName, lastName, username, password });
  }

  console.log('Updated user credentials successfully.\n');
  console.log('Meno,Priezvisko,Používateľské meno,Heslo');
  credentialRows.forEach((row) => {
    console.log(`${row.firstName},${row.lastName},${row.username},${row.password}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
