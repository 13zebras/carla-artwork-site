import { randomUUID } from 'node:crypto';

import { getDb } from './db.server';

export type ArtworkCategoryRecord = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sortOrder: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};

type CategoryRow = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort_order: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
};

function toRecord(row: CategoryRow): ArtworkCategoryRecord {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    description: row.description,
    sortOrder: row.sort_order,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeLabel(label: string) {
  const value = label.trim();
  if (value.length === 0) {
    throw new Error('Category label is required');
  }
  if (value.length > 80) {
    throw new Error('Category label must be 80 characters or less');
  }
  return value;
}

function normalizeSortOrder(sortOrder: number | undefined) {
  if (sortOrder === undefined) {
    return undefined;
  }
  if (!Number.isInteger(sortOrder)) {
    throw new Error('Category sort order must be an integer');
  }
  return sortOrder;
}

export function listCategories({ includeArchived = false }: { includeArchived?: boolean } = {}) {
  const db = getDb();
  const rows = db
    .prepare(
      `select id, slug, label, description, sort_order, status, created_at, updated_at
       from artwork_categories
       ${includeArchived ? '' : "where status = 'active'"}
       order by sort_order asc, label asc`,
    )
    .all() as CategoryRow[];

  return rows.map(toRecord);
}

export function resolveCategoryInput(input: string) {
  const value = input.trim();
  if (value.length === 0) {
    return undefined;
  }

  const db = getDb();
  const byId = db
    .prepare(
      'select id, slug, label, description, sort_order, status, created_at, updated_at from artwork_categories where id = ? limit 1',
    )
    .get(value) as CategoryRow | undefined;
  if (byId) {
    return toRecord(byId);
  }

  const lowerValue = value.toLowerCase();
  const bySlug = db
    .prepare(
      'select id, slug, label, description, sort_order, status, created_at, updated_at from artwork_categories where lower(slug) = ? limit 1',
    )
    .get(lowerValue) as CategoryRow | undefined;
  if (bySlug) {
    return toRecord(bySlug);
  }

  const byLabel = db
    .prepare(
      'select id, slug, label, description, sort_order, status, created_at, updated_at from artwork_categories where lower(label) = ? limit 1',
    )
    .get(lowerValue) as CategoryRow | undefined;
  return byLabel ? toRecord(byLabel) : undefined;
}

export function addCategory(input: {
  label: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
}) {
  const db = getDb();
  const label = normalizeLabel(input.label);
  const description = input.description?.trim() || null;
  const sortOrder = normalizeSortOrder(input.sortOrder);
  const createdAt = new Date().toISOString();
  const existingRows = db
    .prepare('select slug, lower(label) as normalized_label from artwork_categories')
    .all() as Array<{ slug: string; normalized_label: string }>;
  const existingSlugs = new Set(existingRows.map((row) => row.slug));
  const normalizedLabels = new Set(existingRows.map((row) => row.normalized_label));

  const baseSlug = input.slug?.trim() ? slugify(input.slug.trim()) : slugify(label);
  if (!baseSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(baseSlug)) {
    throw new Error('Category slug must contain only lowercase letters, numbers, and hyphens');
  }

  if (normalizedLabels.has(label.toLowerCase())) {
    throw new Error('Category label already exists');
  }

  if (existingSlugs.has(baseSlug)) {
    throw new Error('Category slug already exists');
  }

  const slug = baseSlug;

  const nextSortOrder =
    sortOrder ??
    ((
      db.prepare('select max(sort_order) as maxSortOrder from artwork_categories').get() as
        | { maxSortOrder: number | null }
        | undefined
    )?.maxSortOrder ?? 0) + 10;
  const record = {
    id: randomUUID(),
    slug,
    label,
    description,
    sortOrder: nextSortOrder,
    status: 'active' as const,
    createdAt,
    updatedAt: createdAt,
  };

  db.prepare(
    `insert into artwork_categories (
      id,
      slug,
      label,
      description,
      sort_order,
      status,
      created_at,
      updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    record.id,
    record.slug,
    record.label,
    record.description,
    record.sortOrder,
    record.status,
    record.createdAt,
    record.updatedAt,
  );

  return record satisfies ArtworkCategoryRecord;
}
