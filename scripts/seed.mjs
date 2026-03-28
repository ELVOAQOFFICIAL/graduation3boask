/**
 * Seed script for Graduation Song Request Platform
 * 
 * Run with: node scripts/seed.mjs
 * 
 * This generates usernames + passwords for all 30 guests,
 * hashes them with bcrypt, and outputs SQL INSERT statements
 * to run in Supabase SQL Editor.
 * 
 * It also outputs a credentials CSV for the admin to distribute.
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const COST_FACTOR = 12;

// All guests: [firstName, lastName]
const guests = [
  ['Rebeka', 'Adamcová'],
  ['Nina', 'Babečková'],
  ['Zuzana', 'Barutová'],
  ['Ema', 'Drozdová'],
  ['Leon Martin', 'Eliáš'],
  ['Dominik', 'Folajtár'],
  ['Sofia', 'Hečková'],
  ['Nela', 'Hrdlicová'],
  ['Ljubka', 'Jankovičová'],
  ['Nina', 'Kanovičová'],
  ['Nikola', 'Kašťáková'],
  ['Jakub', 'Kriška'],
  ['Dominika', 'Malá'],
  ['Natália', 'Mišovičová'],
  ['Samuel', 'Penyak'],
  ['Lea', 'Porubská'],
  ['Alan', 'Pučík'],
  ['Vanesa', 'Radošinská'],
  ['Lukáš', 'Rajnic'],
  ['Viktória', 'Rosinecová'],
  ['Romana', 'Sedláková'],
  ['Martin', 'Seewald'],
  ['Simona', 'Slobodová'],
  ['Katarína', 'Stankovenová'],
  ['Soňa', 'Svetlíková'],
  ['Nela', 'Šiková'],
  ['Sara', 'Šiková'],
  ['Sára', 'Zahradníková'],
  ['Dominika', 'Žáková'],
  ['Maximilián', 'Žitňanský'],
];

function generatePassword() {
  return crypto.randomBytes(12).toString('base64url'); // ~16 chars, URL-safe
}

function generateUsername(firstName, lastName, index) {
  // Create a simple username: first letter of first name + normalized last name + 2-digit number
  const normFirst = firstName.split(' ')[0].toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normLast = lastName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `${normFirst}.${normLast}`;
}

async function main() {
  console.log('=== GRADUATION PLATFORM — SEED DATA GENERATOR ===\n');
  
  const credentials = [];
  const userInserts = [];
  const nameInserts = [];
  
  // Track usernames to avoid duplicates
  const usedUsernames = new Set();
  
  for (let i = 0; i < guests.length; i++) {
    const [firstName, lastName] = guests[i];
    let username = generateUsername(firstName, lastName, i);
    
    // Handle duplicate usernames (e.g., two Šiková)
    if (usedUsernames.has(username)) {
      const firstInitial = firstName.split(' ')[0].toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      username = `${firstInitial}.${lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}2`;
    }
    usedUsernames.add(username);
    
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, COST_FACTOR);
    
    credentials.push({
      firstName,
      lastName,
      username,
      password,
    });
    
    userInserts.push(
      `INSERT INTO users (username, password_hash, first_name, last_name, role, is_active) VALUES ('${username}', '${passwordHash}', '', '', 'user', TRUE);`
    );
    
    nameInserts.push(
      `INSERT INTO allowed_names (first_name, last_name) VALUES ('${firstName}', '${lastName}');`
    );
  }
  
  // Output SQL
  console.log('-- =============================================');
  console.log('-- SQL INSERTS — Run in Supabase SQL Editor');
  console.log('-- =============================================\n');
  
  console.log('-- Users');
  userInserts.forEach(s => console.log(s));
  
  console.log('\n-- Allowed Names');
  nameInserts.forEach(s => console.log(s));
  
  // Output credentials CSV
  console.log('\n\n-- =============================================');
  console.log('-- CREDENTIALS CSV — Distribute to guests');
  console.log('-- =============================================\n');
  console.log('Meno,Priezvisko,Používateľské meno,Heslo');
  credentials.forEach(c => {
    console.log(`${c.firstName},${c.lastName},${c.username},${c.password}`);
  });
  
  // Output as a nice table
  console.log('\n\n-- =============================================');
  console.log('-- CREDENTIALS TABLE');
  console.log('-- =============================================\n');
  console.log('Meno'.padEnd(20) + 'Priezvisko'.padEnd(20) + 'Používateľské meno'.padEnd(25) + 'Heslo');
  console.log('-'.repeat(85));
  credentials.forEach(c => {
    console.log(
      c.firstName.padEnd(20) +
      c.lastName.padEnd(20) +
      c.username.padEnd(25) +
      c.password
    );
  });
}

main().catch(console.error);
