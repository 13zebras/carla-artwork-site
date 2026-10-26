import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';

import { getServerEnv } from './env.server';
import { getRuntimeContext } from './runtimeContext.server';

type AppDatabase = Record<string, never>;

const LATEST_MIGRATION = '007_bee_outline_gray.sql';

type DatabaseState = {
  pool?: pg.Pool;
  db?: Kysely<AppDatabase>;
  schemaPromise?: Promise<void>;
};
const databaseKey = Symbol('database');

function getDatabaseState(): DatabaseState {
  const context = getRuntimeContext();
  let state = context.resources.get(databaseKey) as DatabaseState | undefined;
  if (!state) {
    state = {};
    context.resources.set(databaseKey, state);
    const requestDatabase = state;
    context.cleanups.add(() => destroyDatabase(requestDatabase));
  }
  return state;
}

export function getPool(): pg.Pool {
  const state = getDatabaseState();
  if (!state.pool) {
    const { DATABASE_URL } = getServerEnv();
    state.pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });
  }
  return state.pool;
}

export function getKysely(): Kysely<AppDatabase> {
  const state = getDatabaseState();
  if (!state.db) {
    state.db = new Kysely<AppDatabase>({ dialect: new PostgresDialect({ pool: getPool() }) });
  }
  return state.db;
}

export function toIsoTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function ensureSchema(): Promise<void> {
  const state = getDatabaseState();
  if (!state.schemaPromise) {
    state.schemaPromise = assertSchemaIsCurrent();
  }
  return state.schemaPromise;
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

async function destroyDatabase(state: DatabaseState): Promise<void> {
  const { db, pool } = state;
  state.db = undefined;
  state.pool = undefined;
  state.schemaPromise = undefined;
  try {
    await db?.destroy();
  } finally {
    // Kysely initializes its driver lazily. Also close a pool obtained directly
    // through getPool(), even if no Kysely query initialized the driver.
    if (pool && !pool.ended) await pool.end();
  }
}

export async function closeDb(): Promise<void> {
  await destroyDatabase(getDatabaseState());
}
