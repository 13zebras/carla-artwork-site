import pg from 'pg';
import { afterAll, beforeAll } from 'vitest';

import { closeDb, ensureSchema } from '@/lib/db.server';

const envDefaults = {
  DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/carla_test',
  BETTER_AUTH_SECRET: 'test-secret-for-better-auth',
  BETTER_AUTH_URL: 'http://localhost:3000',
  ADMIN_EMAIL: 'admin@example.com',
  RESEND_API_KEY: 're_test_dummy',
  AUTH_EMAIL_FROM: 'Carla Stine <admin@example.com>',
  BUNNY_STORAGE_ZONE: 'test-zone',
  BUNNY_STORAGE_PASSWORD: 'test-password',
  BUNNY_STORAGE_ENDPOINT: 'http://127.0.0.1:3999',
  BUNNY_CDN_BASE_URL: 'https://carla.b-cdn.net',
};

for (const [key, value] of Object.entries(envDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function ensureTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for tests');
  }

  const url = new URL(databaseUrl);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name');
  }
  if (!databaseName.toLowerCase().includes('test')) {
    throw new Error(
      `Refusing to run tests against non-test database "${databaseName}". Set DATABASE_URL to a dedicated test database.`,
    );
  }

  const maintenanceUrl = new URL(url);
  maintenanceUrl.pathname = '/postgres';

  const client = new pg.Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();

  try {
    const result = await client.query('select 1 from pg_database where datname = $1', [
      databaseName,
    ]);
    if (result.rowCount === 0) {
      await client.query(`create database ${quoteIdentifier(databaseName)}`);
    }
  } finally {
    await client.end();
  }
}

beforeAll(async () => {
  await ensureTestDatabase();
  await ensureSchema();
});

afterAll(async () => {
  await closeDb();
});
