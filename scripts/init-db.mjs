// Initializes the `carla` database with the app schema.
// Self-contained: loads DATABASE_URL from .env.local, uses the `pg` package.
// Idempotent (create table if not exists) — safe to re-run.
// No categories are seeded; they are added through the admin UI.
//
//   node scripts/init-db.mjs        (or)   pnpm db:init

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
    await client.query(`create index if not exists "session_userId_idx" on "session"("userId")`);
    await client.query(`create index if not exists "account_userId_idx" on account("userId")`);
    await client.query(
      `create index if not exists "verification_identifier_idx" on verification(identifier)`,
    );

    // app tables
    await client.query(`
      create table if not exists site_settings (
        id text primary key check (id = 'site'),
        demo_mode boolean not null default false,
        about_text text not null default '',
        about_mobile_image_path text,
        about_desktop_image_path text,
        about_image_alt text not null default '',
        updated_at text not null
      )
    `);
    await client.query(
      `alter table site_settings add column if not exists about_text text not null default ''`,
    );
    await client.query(
      `alter table site_settings add column if not exists about_mobile_image_path text`,
    );
    await client.query(
      `alter table site_settings add column if not exists about_desktop_image_path text`,
    );
    await client.query(
      `alter table site_settings add column if not exists about_image_alt text not null default ''`,
    );
    await client.query(`
      insert into site_settings (id, demo_mode, updated_at)
      values ('site', false, current_timestamp::text)
      on conflict (id) do nothing
    `);

    await client.query(`create sequence if not exists artwork_category_id_seq`);
    await client.query(`
      create table if not exists artwork_categories (
        id text primary key,
        category_slug text not null,
        label text not null,
        description text,
        sort_order integer not null default 0,
        status text not null default 'active' check (status in ('active','archived')),
        created_at text not null,
        updated_at text not null
      )
    `);
    await client.query(
      `alter table artwork_categories add column if not exists category_slug text`,
    );
    await client.query(`
      update artwork_categories
      set category_slug = id
      where category_slug is null or category_slug = ''
    `);
    await client.query(`alter table artwork_categories drop column if exists slug`);
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
    await client.query(`
      do $$
      declare
        fk_name text;
      begin
        select conname into fk_name
        from pg_constraint
        where conrelid = 'artworks'::regclass
          and confrelid = 'artwork_categories'::regclass
          and contype = 'f'
        limit 1;

        if fk_name is not null then
          execute format('alter table artworks drop constraint %I', fk_name);
        end if;
      end $$
    `);
    await client.query(`drop table if exists category_id_migration`);
    await client.query(
      `create temporary table category_id_migration (old_id text primary key, new_id text not null) on commit drop`,
    );
    await client.query(`
      with max_existing as (
        select coalesce(max((substring(id from 2))::integer), 0) as max_id
        from artwork_categories
        where id ~ '^c[0-9]+$'
      ), legacy as (
        select
          id as old_id,
          row_number() over (order by sort_order asc, label asc, id asc) as rn
        from artwork_categories
        where id !~ '^c[0-9]+$'
      )
      insert into category_id_migration (old_id, new_id)
      select legacy.old_id, 'c' || lpad((max_existing.max_id + legacy.rn)::text, 3, '0')
      from legacy
      cross join max_existing
    `);
    await client.query(`
      update artworks
      set category_id = category_id_migration.new_id
      from category_id_migration
      where artworks.category_id = category_id_migration.old_id
    `);
    await client.query(`
      update artwork_categories
      set id = category_id_migration.new_id
      from category_id_migration
      where artwork_categories.id = category_id_migration.old_id
    `);
    await client.query(`
      do $$
      begin
        if not exists (
          select 1
          from pg_constraint
          where conrelid = 'artworks'::regclass
            and confrelid = 'artwork_categories'::regclass
            and contype = 'f'
        ) then
          alter table artworks
          add constraint artworks_category_id_fkey
          foreign key (category_id) references artwork_categories(id);
        end if;
      end $$
    `);
    await client.query(`alter table artwork_categories alter column category_slug set not null`);
    await client.query(`
      select setval(
        'artwork_category_id_seq',
        greatest(coalesce(max((substring(id from 2))::integer), 0), 1),
        coalesce(max((substring(id from 2))::integer), 0) > 0
      )
      from artwork_categories
      where id ~ '^c[0-9]+$'
    `);
    await client.query(
      `create unique index if not exists "artwork_categories_category_slug_idx" on artwork_categories(category_slug)`,
    );
    await client.query(
      `create index if not exists "artwork_categories_status_sort_idx" on artwork_categories(status, sort_order, label)`,
    );
    await client.query(
      `create index if not exists "artworks_category_idx" on artworks(category_id)`,
    );
    await client.query(
      `create index if not exists "artworks_status_sort_idx" on artworks(status, sort_order, created_at)`,
    );

    await client.query('COMMIT');

    const { rows } = await client.query(
      `select count(*)::int as n from information_schema.tables where table_schema = 'public'`,
    );
    console.log(`✓ Schema ready — ${rows[0].n} tables.`);
    console.log('ℹ No categories seeded. Add categories through the admin UI.');
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
