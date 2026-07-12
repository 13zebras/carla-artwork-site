import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';

import { getServerEnv } from './env.server';

type AppDatabase = Record<string, never>;

const LATEST_MIGRATION = '002_native_timestamps.sql';

let pool: pg.Pool | undefined;
let db: Kysely<AppDatabase> | undefined;
let schemaPromise: Promise<void> | undefined;

export function getPool(): pg.Pool {
  if (!pool) {
    const { DATABASE_URL } = getServerEnv();
    pool = new pg.Pool({ connectionString: DATABASE_URL });
  }
  return pool;
}

export function getKysely(): Kysely<AppDatabase> {
  if (!db) {
    db = new Kysely<AppDatabase>({ dialect: new PostgresDialect({ pool: getPool() }) });
  }
  return db;
}

export function toIsoTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = assertSchemaIsCurrent();
  }
  return schemaPromise;
}

async function assertSchemaIsCurrent() {
  const database = getKysely();
  const tableResult = await sql<{ exists: boolean }>`
    select to_regclass(current_schema() || '.schema_migrations') is not null as exists
  `.execute(database);

  if (!tableResult.rows[0]?.exists) {
    throw new Error('Database schema is not current. Run `pnpm db:migrate`.');
  }

  const migrationResult = await sql<{ current: boolean }>`
    select exists (
      select 1 from schema_migrations where name = ${LATEST_MIGRATION}
    ) as current
  `.execute(database);

  if (!migrationResult.rows[0]?.current) {
    throw new Error('Database schema is not current. Run `pnpm db:migrate`.');
  }
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = undefined;
  }
  pool = undefined;
  schemaPromise = undefined;
}
