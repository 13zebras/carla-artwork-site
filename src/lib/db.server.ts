import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';

import { getServerEnv } from './env.server';

type AppDatabase = Record<string, never>;

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

export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = initAppSchema();
  }
  return schemaPromise;
}

export async function initAppSchema(): Promise<void> {
  const database = getKysely();

  await database.transaction().execute(async (db) => {
    await sql`
      create table if not exists "user" (
        id text primary key,
        name text not null,
        email text not null unique,
        "emailVerified" boolean not null default false,
        image text,
        "createdAt" timestamptz not null default current_timestamp,
        "updatedAt" timestamptz not null default current_timestamp
      )
    `.execute(db);

    await sql`
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
    `.execute(db);

    await sql`
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
    `.execute(db);

    await sql`
      create table if not exists verification (
        id text primary key,
        identifier text not null,
        value text not null,
        "expiresAt" timestamptz not null,
        "createdAt" timestamptz not null default current_timestamp,
        "updatedAt" timestamptz not null default current_timestamp
      )
    `.execute(db);

    await sql`create index if not exists "session_userId_idx" on "session"("userId")`.execute(db);
    await sql`create index if not exists "account_userId_idx" on account("userId")`.execute(db);
    await sql`create index if not exists "verification_identifier_idx" on verification(identifier)`.execute(
      db,
    );

    await sql`
      create table if not exists site_settings (
        id text primary key check (id = 'site'),
        demo_mode boolean not null default false,
        updated_at text not null
      )
    `.execute(db);
    await sql`
      insert into site_settings (id, demo_mode, updated_at)
      values ('site', false, ${new Date().toISOString()})
      on conflict (id) do nothing
    `.execute(db);

    await sql`create sequence if not exists artwork_category_id_seq`.execute(db);

    await sql`
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
    `.execute(db);
    await sql`alter table artwork_categories add column if not exists category_slug text`.execute(
      db,
    );
    await sql`
      update artwork_categories
      set category_slug = id
      where category_slug is null or category_slug = ''
    `.execute(db);
    await sql`alter table artwork_categories drop column if exists slug`.execute(db);

    await sql`
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
    `.execute(db);

    await sql`
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
    `.execute(db);

    await sql`drop table if exists category_id_migration`.execute(db);
    await sql`create temporary table category_id_migration (old_id text primary key, new_id text not null)`.execute(
      db,
    );
    await sql`
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
    `.execute(db);
    await sql`
      update artworks
      set category_id = category_id_migration.new_id
      from category_id_migration
      where artworks.category_id = category_id_migration.old_id
    `.execute(db);
    await sql`
      update artwork_categories
      set id = category_id_migration.new_id
      from category_id_migration
      where artwork_categories.id = category_id_migration.old_id
    `.execute(db);
    await sql`drop table if exists category_id_migration`.execute(db);

    await sql`
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
    `.execute(db);

    await sql`alter table artwork_categories alter column category_slug set not null`.execute(db);
    await sql`
      select setval(
        'artwork_category_id_seq',
        greatest(coalesce(max((substring(id from 2))::integer), 0), 1),
        coalesce(max((substring(id from 2))::integer), 0) > 0
      )
      from artwork_categories
      where id ~ '^c[0-9]+$'
    `.execute(db);

    await sql`create unique index if not exists "artwork_categories_category_slug_idx" on artwork_categories(category_slug)`.execute(
      db,
    );
    await sql`create index if not exists "artwork_categories_status_sort_idx" on artwork_categories(status, sort_order, label)`.execute(
      db,
    );
    await sql`create index if not exists "artworks_category_idx" on artworks(category_id)`.execute(
      db,
    );
    await sql`create index if not exists "artworks_status_sort_idx" on artworks(status, sort_order, created_at)`.execute(
      db,
    );
  });
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
    db = undefined;
  }
  pool = undefined;
  schemaPromise = undefined;
}
