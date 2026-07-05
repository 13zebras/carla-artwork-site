// Initializes the `carla` database with the app schema + category seeds.
// Self-contained: loads DATABASE_URL from .env.local, uses the `pg` package.
// Idempotent (create table if not exists / on conflict do nothing) — safe to re-run.
//
//   node scripts/init-db.mjs        (or)   pnpm db:init

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
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

// Same category seeds as src/lib/db.server.ts (descriptions from src/data/artworkCategories.ts).
const CATEGORY_SEEDS = [
  {
    id: 'illustration',
    slug: 'illustration',
    label: 'Illustration',
    sort_order: 10,
    description:
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  },
  {
    id: 'fineArtCollage',
    slug: 'fine-art-collage',
    label: 'Fine Art Collage',
    sort_order: 20,
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  },
  {
    id: 'graphicDesign',
    slug: 'graphic-design',
    label: 'Graphic Design',
    sort_order: 30,
    description:
      'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.',
  },
  {
    id: 'food',
    slug: 'food',
    label: 'Food',
    sort_order: 40,
    description:
      'Tempus leo eu aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada lacinia integer nunc posuere. Et harum quidem rerum facilis est et expedita distinctio.',
  },
  {
    id: 'botanicalIllustration',
    slug: 'botanical-illustration',
    label: 'Botanical Illustration',
    sort_order: 50,
    description:
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  },
  {
    id: 'specialProjects',
    slug: 'special-projects',
    label: 'Special Projects',
    sort_order: 60,
    description:
      'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
  },
];

const pool = new pg.Pool({ connectionString: databaseUrl });

async function main() {
  const client = await pool.connect();
  try {
    console.log(`→ Connecting to: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);

    await client.query('BEGIN');

    // better-auth tables
    await client.query(`
      create table if not exists "user" (
        id text primary key,
        name text not null,
        email text not null unique,
        "emailVerified" boolean not null default false,
        image text,
        "createdAt" timestamptz not null default current_timestamp,
        "updatedAt" timestamptz not null default current_timestamp
      )
    `);
    await client.query(`
      create table if not exists "session" (
        id text primary key,
        "expiresAt" timestamptz not null,
        token text not null unique,
        "createdAt" timestamptz not null default current_timestamp,
        "updatedAt" timestamptz not null default current_timestamp,
        "ipAddress" text,
        "userAgent" text,
        "userId" text not null references "user"(id) on delete cascade
      )
    `);
    await client.query(`
      create table if not exists account (
        id text primary key,
        "accountId" text not null,
        "providerId" text not null,
        "userId" text not null references "user"(id) on delete cascade,
        "accessToken" text,
        "refreshToken" text,
        "idToken" text,
        "accessTokenExpiresAt" timestamptz,
        "refreshTokenExpiresAt" timestamptz,
        scope text,
        password text,
        "createdAt" timestamptz not null default current_timestamp,
        "updatedAt" timestamptz not null default current_timestamp
      )
    `);
    await client.query(`
      create table if not exists verification (
        id text primary key,
        identifier text not null,
        value text not null,
        "expiresAt" timestamptz not null,
        "createdAt" timestamptz not null default current_timestamp,
        "updatedAt" timestamptz not null default current_timestamp
      )
    `);
    await client.query(
      `create index if not exists "session_userId_idx" on "session"("userId")`,
    );
    await client.query(`create index if not exists "account_userId_idx" on account("userId")`);
    await client.query(
      `create index if not exists "verification_identifier_idx" on verification(identifier)`,
    );

    // app tables
    await client.query(`
      create table if not exists artwork_categories (
        id text primary key,
        slug text not null unique,
        label text not null,
        description text,
        sort_order integer not null default 0,
        status text not null default 'active' check (status in ('active','archived')),
        created_at text not null,
        updated_at text not null
      )
    `);
    await client.query(`
      create table if not exists artworks (
        id text primary key,
        slug text not null unique,
        title text not null,
        category_id text not null references artwork_categories(id),
        description text,
        alt text not null,
        original_filename text not null,
        storage_path text not null unique,
        cdn_url text not null,
        content_type text not null,
        width integer not null,
        height integer not null,
        size_bytes integer not null,
        checksum_sha256 text not null,
        sort_order integer not null default 0,
        status text not null default 'draft' check (status in ('draft','published')),
        created_at text not null,
        updated_at text not null
      )
    `);
    await client.query(
      `create index if not exists "artwork_categories_status_sort_idx" on artwork_categories(status, sort_order, label)`,
    );
    await client.query(`create index if not exists "artworks_category_idx" on artworks(category_id)`);
    await client.query(
      `create index if not exists "artworks_status_sort_idx" on artworks(status, sort_order, created_at)`,
    );

    await client.query('COMMIT');

    // seed categories (on conflict do nothing)
    const createdAt = new Date().toISOString();
    for (const category of CATEGORY_SEEDS) {
      await client.query(
        `insert into artwork_categories (id, slug, label, description, sort_order, status, created_at, updated_at)
         values ($1, $2, $3, $4, $5, 'active', $6, $6)
         on conflict (id) do nothing`,
        [category.id, category.slug, category.label, category.description, category.sort_order, createdAt],
      );
    }

    const { rows } = await client.query(
      `select count(*)::int as n from information_schema.tables where table_schema = 'public'`,
    );
    const { rows: catRows } = await client.query(
      `select count(*)::int as n from artwork_categories`,
    );
    console.log(
      `✓ Schema ready — ${rows[0].n} tables, ${catRows[0].n} category rows in artwork_categories.`,
    );
  } finally {
    client.release();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✖ Init failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
