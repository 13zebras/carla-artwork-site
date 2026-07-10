import { sql, type Kysely, type Transaction } from 'kysely';

import { slugify } from '@/lib/utils';

import { getKysely } from './db.server';

type Executable = Kysely<Record<string, never>> | Transaction<Record<string, never>>;

export type ArtworkCategoryRecord = {
  id: string;
  categorySlug: string;
  label: string;
  description: string | null;
  sortOrder: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};

type CategoryRow = {
  id: string;
  category_slug: string;
  label: string;
  description: string | null;
  sort_order: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
};

const CATEGORY_SELECT = sql`
  id,
  category_slug,
  label,
  description,
  sort_order,
  status,
  created_at,
  updated_at
`;

function toRecord(row: CategoryRow): ArtworkCategoryRecord {
  return {
    id: row.id,
    categorySlug: row.category_slug,
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

function normalizeCategorySlug(label: string) {
  const categorySlug = slugify(label);
  if (!categorySlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(categorySlug)) {
    throw new Error('Category slug must contain only lowercase letters, numbers, and hyphens');
  }
  return categorySlug;
}

function normalizeStatus(status: string | undefined): 'active' | 'archived' {
  if (status === 'active' || status === 'archived') {
    return status;
  }
  throw new Error('Category status must be active or archived');
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

async function getNextCategoryId(conn: Executable) {
  const { rows } = await sql`select nextval('artwork_category_id_seq')::int as n`.execute(conn);
  const value = (rows[0] as { n: number } | undefined)?.n;
  if (!value) {
    throw new Error('Unable to generate category id');
  }
  return `c${String(value).padStart(3, '0')}`;
}

export async function listCategories({
  includeArchived = false,
}: { includeArchived?: boolean } = {}) {
  const { rows } = await sql`
    select ${CATEGORY_SELECT}
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

  const { rows } = await sql`
    select ${CATEGORY_SELECT}
    from artwork_categories where id = ${value} limit 1
  `.execute(getKysely());

  const row = rows[0] as CategoryRow | undefined;
  return row ? toRecord(row) : undefined;
}

export async function addCategory(input: {
  label: string;
  description?: string;
  sortOrder?: number;
}) {
  const db = getKysely();
  const label = normalizeLabel(input.label);
  const categorySlug = normalizeCategorySlug(label);
  const description = input.description?.trim() || null;
  const sortOrder = normalizeSortOrder(input.sortOrder);

  return db.transaction().execute(async (trx) => {
    const existing = await sql`
      select lower(label) as normalized_label, category_slug
      from artwork_categories
    `.execute(trx);
    const existingRows = existing.rows as Array<{
      normalized_label: string;
      category_slug: string;
    }>;
    const normalizedLabels = new Set(existingRows.map((row) => row.normalized_label));
    const categorySlugs = new Set(existingRows.map((row) => row.category_slug));

    if (normalizedLabels.has(label.toLowerCase())) {
      throw new Error('Category label already exists');
    }

    if (categorySlugs.has(categorySlug)) {
      throw new Error('Category slug already exists');
    }

    const maxRow = await sql`select max(sort_order) as "maxSortOrder" from artwork_categories`.execute(
      trx,
    );
    const maxSortOrder =
      (maxRow.rows[0] as { maxSortOrder: number | null } | undefined)?.maxSortOrder ?? 0;
    const nextSortOrder = sortOrder ?? maxSortOrder + 10;

    const createdAt = new Date().toISOString();
    const record: ArtworkCategoryRecord = {
      id: await getNextCategoryId(trx),
      categorySlug,
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
        category_slug,
        label,
        description,
        sort_order,
        status,
        created_at,
        updated_at
      ) values (
        ${record.id},
        ${record.categorySlug},
        ${record.label},
        ${record.description},
        ${record.sortOrder},
        ${record.status},
        ${record.createdAt},
        ${record.updatedAt}
      )
    `.execute(trx);

    return record satisfies ArtworkCategoryRecord;
  });
}

export async function getCategoryById(id: string) {
  const { rows } = await sql`
    select ${CATEGORY_SELECT}
    from artwork_categories where id = ${id} limit 1
  `.execute(getKysely());

  const row = rows[0] as CategoryRow | undefined;
  return row ? toRecord(row) : undefined;
}

export async function getCategoryBySlug(categorySlug: string) {
  const value = categorySlug.trim().toLowerCase();
  if (value.length === 0) {
    return undefined;
  }

  const { rows } = await sql`
    select ${CATEGORY_SELECT}
    from artwork_categories where category_slug = ${value} limit 1
  `.execute(getKysely());

  const row = rows[0] as CategoryRow | undefined;
  return row ? toRecord(row) : undefined;
}

export type CategoryUpdate = {
  id: string;
  label: string;
  description?: string | null;
  sortOrder?: number;
  status: 'active' | 'archived';
};

export async function updateCategory(input: CategoryUpdate) {
  const db = getKysely();

  const existing = await getCategoryById(input.id);
  if (!existing) {
    throw new Error('Category not found');
  }

  const label = normalizeLabel(input.label);
  const categorySlug = normalizeCategorySlug(label);
  const description = input.description?.trim() || null;
  const sortOrder = normalizeSortOrder(input.sortOrder) ?? existing.sortOrder;
  const status = normalizeStatus(input.status);

  const dupeLabel =
    await sql`select 1 from artwork_categories where lower(label) = ${label.toLowerCase()} and id <> ${input.id} limit 1`.execute(
      db,
    );
  if (dupeLabel.rows.length > 0) {
    throw new Error('Category label already exists');
  }

  const dupeSlug =
    await sql`select 1 from artwork_categories where category_slug = ${categorySlug} and id <> ${input.id} limit 1`.execute(
      db,
    );
  if (dupeSlug.rows.length > 0) {
    throw new Error('Category slug already exists');
  }

  const updatedAt = new Date().toISOString();
  await sql`
    update artwork_categories
    set
      category_slug = ${categorySlug},
      label = ${label},
      description = ${description},
      sort_order = ${sortOrder},
      status = ${status},
      updated_at = ${updatedAt}
    where id = ${input.id}
  `.execute(db);

  const refreshed = await getCategoryById(input.id);
  if (!refreshed) {
    throw new Error('Category not found');
  }
  return refreshed;
}

export async function countArtworksByCategory(id: string) {
  const { rows } =
    await sql`select count(*)::int as n from artworks where category_id = ${id}`.execute(
      getKysely(),
    );
  return (rows[0] as { n: number } | undefined)?.n ?? 0;
}

export async function deleteCategoryById(id: string) {
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new Error('Category not found');
  }

  const artworkCount = await countArtworksByCategory(id);
  if (artworkCount > 0) {
    throw new Error(
      `Cannot delete a category that is used by ${artworkCount} artwork${artworkCount === 1 ? '' : 's'}. Reassign or delete those artworks first.`,
    );
  }

  await sql`delete from artwork_categories where id = ${id}`.execute(getKysely());
  return existing;
}
