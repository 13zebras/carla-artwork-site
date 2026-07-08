import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';

import { artworkCategoryDescriptions } from '@/data/artworkCategories';

import { getServerEnv } from './env.server';

const CATEGORY_SEEDS = [
  {
    id: 'illustration',
    label: 'Illustration',
    sort_order: 10,
    description: artworkCategoryDescriptions.illustration,
  },
  {
    id: 'fine-art-collage',
    label: 'Fine Art Collage',
    sort_order: 20,
    description: artworkCategoryDescriptions.fineArtCollage,
  },
  {
    id: 'graphic-design',
    label: 'Graphic Design',
    sort_order: 30,
    description: artworkCategoryDescriptions.graphicDesign,
  },
  {
    id: 'food',
    label: 'Food',
    sort_order: 40,
    description: artworkCategoryDescriptions.food,
  },
  {
    id: 'botanical-illustration',
    label: 'Botanical Illustration',
    sort_order: 50,
    description: artworkCategoryDescriptions.botanicalIllustration,
  },
  {
    id: 'special-projects',
    label: 'Special Projects',
    sort_order: 60,
    description: artworkCategoryDescriptions.specialProjects,
  },
] as const;

type AppDatabase = Record<string, never>;

let pool: pg.Pool | undefined;
let db: Kysely<AppDatabase> | undefined;
let schemaPromise: Promise<void> | undefined;

function nowIso() {
  return new Date().toISOString();
}

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

  await database.connection().execute(async (db) => {
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
      create table if not exists artwork_categories (
        id text primary key,
        label text not null,
        description text,
        sort_order integer not null default 0,
        status text not null default 'active' check (status in ('active','archived')),
        created_at text not null,
        updated_at text not null
      )
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

    await sql`create index if not exists "artwork_categories_status_sort_idx" on artwork_categories(status, sort_order, label)`.execute(
      db,
    );
    await sql`create index if not exists "artworks_category_idx" on artworks(category_id)`.execute(db);
    await sql`create index if not exists "artworks_status_sort_idx" on artworks(status, sort_order, created_at)`.execute(
      db,
    );
  });

  const createdAt = nowIso();
  for (const category of CATEGORY_SEEDS) {
    await sql`
      insert into artwork_categories (id, label, description, sort_order, status, created_at, updated_at)
      values (${category.id}, ${category.label}, ${category.description ?? null}, ${category.sort_order}, 'active', ${createdAt}, ${createdAt})
      on conflict (id) do nothing
    `.execute(database);
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
