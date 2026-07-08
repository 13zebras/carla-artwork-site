import { sql } from 'kysely';

import { slugify } from '@/lib/utils';
import { getKysely } from './db.server';

export type ArtworkCategoryRecord = {
  id: string;
  label: string;
  description: string | null;
  sortOrder: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};

type CategoryRow = {
  id: string;
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
    label: row.label,
    description: row.description,
    sortOrder: row.sort_order,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

export async function listCategories({ includeArchived = false }: { includeArchived?: boolean } = {}) {
  const { rows } = await sql`
    select id, label, description, sort_order, status, created_at, updated_at
    from artwork_categories
    ${includeArchived ? sql`` : sql`where status = 'active'`}
    order by sort_order asc, label asc
  `.execute(getKysely());

  return (rows as CategoryRow[]).map(toRecord);
}

export async function resolveCategoryInput(input: string) {
  const value = input.trim();
  if (value.length === 0) {
    return undefined;
  }

  const db = getKysely();

  const byId = await sql`
    select id, label, description, sort_order, status, created_at, updated_at
    from artwork_categories where id = ${value} limit 1
  `.execute(db);
  const byIdRow = byId.rows[0] as CategoryRow | undefined;
  if (byIdRow) {
    return toRecord(byIdRow);
  }

  const lowerValue = value.toLowerCase();
  const byLabel = await sql`
    select id, label, description, sort_order, status, created_at, updated_at
    from artwork_categories where lower(label) = ${lowerValue} limit 1
  `.execute(db);
  const byLabelRow = byLabel.rows[0] as CategoryRow | undefined;
  return byLabelRow ? toRecord(byLabelRow) : undefined;
}

export async function addCategory(input: {
  label: string;
  description?: string;
  sortOrder?: number;
}) {
  const db = getKysely();
  const label = normalizeLabel(input.label);
  const description = input.description?.trim() || null;
  const sortOrder = normalizeSortOrder(input.sortOrder);

  const existing = await sql`select id, lower(label) as normalized_label from artwork_categories`.execute(
    db,
  );
  const existingRows = existing.rows as Array<{ id: string; normalized_label: string }>;
  const existingIds = new Set(existingRows.map((row) => row.id));
  const normalizedLabels = new Set(existingRows.map((row) => row.normalized_label));

  const id = slugify(label);
  if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error('Category id must contain only lowercase letters, numbers, and hyphens');
  }

  if (normalizedLabels.has(label.toLowerCase())) {
    throw new Error('Category label already exists');
  }

  if (existingIds.has(id)) {
    throw new Error('Category id already exists');
  }

  const maxRow = await sql`select max(sort_order) as "maxSortOrder" from artwork_categories`.execute(db);
  const maxSortOrder = (maxRow.rows[0] as { maxSortOrder: number | null } | undefined)?.maxSortOrder ?? 0;
  const nextSortOrder = sortOrder ?? maxSortOrder + 10;

  const createdAt = new Date().toISOString();
  const record: ArtworkCategoryRecord = {
    id,
    label,
    description,
    sortOrder: nextSortOrder,
    status: 'active' as const,
    createdAt,
    updatedAt: createdAt,
  };

  await sql`
    insert into artwork_categories (
      id,
      label,
      description,
      sort_order,
      status,
      created_at,
      updated_at
    ) values (
      ${record.id},
      ${record.label},
      ${record.description},
      ${record.sortOrder},
      ${record.status},
      ${record.createdAt},
      ${record.updatedAt}
    )
  `.execute(db);

  return record satisfies ArtworkCategoryRecord;
}
