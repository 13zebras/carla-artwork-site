import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import Database from 'better-sqlite3';

import { artworkCategoryDescriptions } from '@/data/artworkCategories';

import { getServerEnv } from './env.server';

const CATEGORY_SEEDS = [
  {
    id: 'illustration',
    slug: 'illustration',
    label: 'Illustration',
    sort_order: 10,
    description: artworkCategoryDescriptions.illustration,
  },
  {
    id: 'fineArtCollage',
    slug: 'fine-art-collage',
    label: 'Fine Art Collage',
    sort_order: 20,
    description: artworkCategoryDescriptions.fineArtCollage,
  },
  {
    id: 'graphicDesign',
    slug: 'graphic-design',
    label: 'Graphic Design',
    sort_order: 30,
    description: artworkCategoryDescriptions.graphicDesign,
  },
  {
    id: 'food',
    slug: 'food',
    label: 'Food',
    sort_order: 40,
    description: artworkCategoryDescriptions.food,
  },
  {
    id: 'botanicalIllustration',
    slug: 'botanical-illustration',
    label: 'Botanical Illustration',
    sort_order: 50,
    description: artworkCategoryDescriptions.botanicalIllustration,
  },
  {
    id: 'specialProjects',
    slug: 'special-projects',
    label: 'Special Projects',
    sort_order: 60,
    description: artworkCategoryDescriptions.specialProjects,
  },
] as const;

let db: Database.Database | undefined;
let schemaReady = false;

function nowIso() {
  return new Date().toISOString();
}

function openDb() {
  if (db) {
    return db;
  }

  const { DATABASE_PATH } = getServerEnv();
  mkdirSync(dirname(DATABASE_PATH), { recursive: true });
  db = new Database(DATABASE_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function getDb() {
  const database = openDb();
  if (!schemaReady) {
    initAppSchema(database);
  }
  return database;
}

export function closeDb() {
  if (!db) {
    return;
  }

  db.close();
  db = undefined;
  schemaReady = false;
}

export function initAppSchema(database = openDb()) {
  if (schemaReady) {
    return database;
  }

  database.exec(`
    create table if not exists "user" (
      id text primary key,
      name text not null,
      email text not null unique,
      emailVerified integer not null,
      image text,
      createdAt text not null,
      updatedAt text not null
    );

    create table if not exists "session" (
      id text primary key,
      expiresAt text not null,
      token text not null unique,
      createdAt text not null,
      updatedAt text not null,
      ipAddress text,
      userAgent text,
      userId text not null references "user"(id) on delete cascade
    );

    create table if not exists account (
      id text primary key,
      accountId text not null,
      providerId text not null,
      userId text not null references "user"(id) on delete cascade,
      accessToken text,
      refreshToken text,
      idToken text,
      accessTokenExpiresAt text,
      refreshTokenExpiresAt text,
      scope text,
      password text,
      createdAt text not null,
      updatedAt text not null
    );

    create table if not exists verification (
      id text primary key,
      identifier text not null,
      value text not null,
      expiresAt text not null,
      createdAt text not null,
      updatedAt text not null
    );

    create index if not exists session_userId_idx on "session"(userId);
    create index if not exists account_userId_idx on account(userId);
    create index if not exists verification_identifier_idx on verification(identifier);

    create table if not exists artwork_categories (
      id text primary key,
      slug text not null unique,
      label text not null,
      description text,
      sort_order integer not null default 0,
      status text not null default 'active' check (status in ('active','archived')),
      created_at text not null,
      updated_at text not null
    );

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
    );

    create index if not exists artwork_categories_status_sort_idx on artwork_categories(status, sort_order, label);
    create index if not exists artworks_category_idx on artworks(category_id);
    create index if not exists artworks_status_sort_idx on artworks(status, sort_order, created_at);
  `);

  const selectCategory = database.prepare('select id from artwork_categories where id = ? limit 1');
  const insertCategory = database.prepare(`
    insert into artwork_categories (
      id,
      slug,
      label,
      description,
      sort_order,
      status,
      created_at,
      updated_at
    ) values (?, ?, ?, ?, ?, 'active', ?, ?)
  `);

  const createdAt = nowIso();
  for (const category of CATEGORY_SEEDS) {
    if (!selectCategory.get(category.id)) {
      insertCategory.run(
        category.id,
        category.slug,
        category.label,
        category.description,
        category.sort_order,
        createdAt,
        createdAt,
      );
    }
  }

  schemaReady = true;
  return database;
}
