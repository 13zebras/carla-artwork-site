// Drops the app tables (artworks, artwork_categories) and re-initializes them.
// Auth tables (user/session/account/verification) are left untouched, so logins persist.
// Delegates the rebuild to scripts/init-db.mjs (idempotent) to keep one source of truth.
// No categories are re-seeded; the categories table starts empty after a reset.
//
//   node scripts/reset-db.mjs        (or)   pnpm db:reset

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function loadEnv(file) {
  try {
    const text = readFileSync(file, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // ignore — fall back to whatever is already in process.env
  }
}

loadEnv(path.join(repoRoot, '.env.local'));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('✖ DATABASE_URL is not set (checked .env.local and the environment).');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    console.log(`→ Connecting to: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);

    // Drop app tables only. artworks holds the FK to artwork_categories, so drop it first.
    await client.query('BEGIN');
    await client.query('drop table if exists artworks');
    await client.query('drop table if exists artwork_categories');
    await client.query('drop sequence if exists artwork_category_id_seq');
    await client.query('COMMIT');

    console.log('✓ Dropped artworks, artwork_categories, and category id sequence (auth tables untouched).');
  } finally {
    client.release();
  }

  // Re-create schema via init-db.mjs (creates only what's missing; no categories seeded).
  console.log('→ Re-initializing schema…');
  execFileSync(process.execPath, [path.join(__dirname, 'init-db.mjs')], {
    stdio: 'inherit',
    cwd: repoRoot,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✖ Reset failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
