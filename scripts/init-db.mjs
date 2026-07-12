// Applies pending SQL migrations to DATABASE_URL.
// Safe to run repeatedly; each migration is recorded in schema_migrations.
//
//   node scripts/init-db.mjs        (or)   pnpm db:migrate

import { createHash } from 'node:crypto';
import { readdir, readFile, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import pg from 'pg';

const readDirectory = promisify(readdir);
const readTextFile = promisify(readFile);
const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');
const migrationsDirectory = path.join(repoRoot, 'migrations');

function loadEnv(file) {
  try {
    const text = readFileSync(file, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex === -1) continue;
      const key = trimmed.slice(0, equalsIndex).trim();
      let value = trimmed.slice(equalsIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // Fall back to the current process environment.
  }
}

export async function runMigrations(databaseUrl) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("select pg_advisory_lock(hashtext('carla_schema_migrations'))");
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        checksum text not null,
        applied_at timestamptz not null default current_timestamp
      )
    `);

    const migrationNames = (await readDirectory(migrationsDirectory))
      .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
      .sort();
    const appliedResult = await client.query('select name, checksum from schema_migrations');
    const applied = new Map(appliedResult.rows.map((row) => [row.name, row.checksum]));

    for (const name of migrationNames) {
      const migration = await readTextFile(path.join(migrationsDirectory, name), 'utf8');
      const checksum = createHash('sha256').update(migration).digest('hex');
      const appliedChecksum = applied.get(name);

      if (appliedChecksum) {
        if (appliedChecksum !== checksum) {
          throw new Error(`Applied migration ${name} has been modified`);
        }
        continue;
      }

      await client.query('begin');
      try {
        await client.query(migration);
        await client.query('insert into schema_migrations (name, checksum) values ($1, $2)', [
          name,
          checksum,
        ]);
        await client.query('commit');
        console.log(`✓ Applied ${name}`);
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }

    return migrationNames.length;
  } finally {
    await client
      .query("select pg_advisory_unlock(hashtext('carla_schema_migrations'))")
      .catch(() => {});
    client.release();
    await pool.end();
  }
}

async function main() {
  loadEnv(path.join(repoRoot, '.env.local'));
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set (checked .env.local and the environment)');
  }

  console.log(`→ Connecting to: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);
  const migrationCount = await runMigrations(databaseUrl);
  console.log(`✓ Database is current (${migrationCount} migrations).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error('✖ Migration failed:', error.message);
    process.exitCode = 1;
  });
}
