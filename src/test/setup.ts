import { mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';

import { afterAll } from 'vitest';

import { closeDb } from '@/lib/db.server';

const envDefaults = {
  DATABASE_PATH: '.data/test.sqlite',
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

const databasePath = process.env.DATABASE_PATH ?? envDefaults.DATABASE_PATH;
mkdirSync(dirname(databasePath), { recursive: true });
rmSync(databasePath, { force: true });

afterAll(() => {
  closeDb();
});
