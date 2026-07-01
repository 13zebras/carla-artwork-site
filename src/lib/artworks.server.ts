import { sql, type Kysely, type Transaction } from 'kysely';

import { getKysely } from './db.server';

type Executable = Kysely<Record<string, never>> | Transaction<Record<string, never>>;

export type ArtworkCategorySummary = {
  id: string;
  slug: string;
  label: string;
};

export type ArtworkStatus = 'draft' | 'published';

export type ArtworkRecord = {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  category: ArtworkCategorySummary;
  description: string | null;
  alt: string;
  originalFilename: string;
  storagePath: string;
  cdnUrl: string;
  contentType: string;
  width: number;
  height: number;
  sizeBytes: number;
  checksumSha256: string;
  sortOrder: number;
  status: ArtworkStatus;
  createdAt: string;
  updatedAt: string;
};

type ArtworkRow = {
  id: string;
  slug: string;
  title: string;
  category_id: string;
  category_slug: string;
  category_label: string;
  description: string | null;
  alt: string;
  original_filename: string;
  storage_path: string;
  cdn_url: string;
  content_type: string;
  width: number;
  height: number;
  size_bytes: number;
  checksum_sha256: string;
  sort_order: number;
  status: ArtworkStatus;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ArtworkRow): ArtworkRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    categoryId: row.category_id,
    category: {
      id: row.category_id,
      slug: row.category_slug,
      label: row.category_label,
    },
    description: row.description,
    alt: row.alt,
    originalFilename: row.original_filename,
    storagePath: row.storage_path,
    cdnUrl: row.cdn_url,
    contentType: row.content_type,
    width: row.width,
    height: row.height,
    sizeBytes: row.size_bytes,
    checksumSha256: row.checksum_sha256,
    sortOrder: row.sort_order,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = sql`
  artworks.id,
  artworks.slug,
  artworks.title,
  artworks.category_id,
  artwork_categories.slug as category_slug,
  artwork_categories.label as category_label,
  artworks.description,
  artworks.alt,
  artworks.original_filename,
  artworks.storage_path,
  artworks.cdn_url,
  artworks.content_type,
  artworks.width,
  artworks.height,
  artworks.size_bytes,
  artworks.checksum_sha256,
  artworks.sort_order,
  artworks.status,
  artworks.created_at,
  artworks.updated_at
`;

export async function insertArtwork(record: ArtworkRecord, conn: Executable = getKysely()) {
  await sql`
    insert into artworks (
      id,
      slug,
      title,
      category_id,
      description,
      alt,
      original_filename,
      storage_path,
      cdn_url,
      content_type,
      width,
      height,
      size_bytes,
      checksum_sha256,
      sort_order,
      status,
      created_at,
      updated_at
    ) values (
      ${record.id},
      ${record.slug},
      ${record.title},
      ${record.categoryId},
      ${record.description},
      ${record.alt},
      ${record.originalFilename},
      ${record.storagePath},
      ${record.cdnUrl},
      ${record.contentType},
      ${record.width},
      ${record.height},
      ${record.sizeBytes},
      ${record.checksumSha256},
      ${record.sortOrder},
      ${record.status},
      ${record.createdAt},
      ${record.updatedAt}
    )
  `.execute(conn);

  return record;
}

export async function listArtworkRecords() {
  const { rows } = await sql`
    select ${SELECT_COLUMNS}
    from artworks
    inner join artwork_categories on artwork_categories.id = artworks.category_id
    order by artworks.created_at desc, artworks.sort_order desc, artworks.title asc
  `.execute(getKysely());

  return (rows as ArtworkRow[]).map(mapRow);
}

export async function getArtworkByStoragePath(storagePath: string) {
  const { rows } = await sql`
    select ${SELECT_COLUMNS}
    from artworks
    inner join artwork_categories on artwork_categories.id = artworks.category_id
    where artworks.storage_path = ${storagePath}
    limit 1
  `.execute(getKysely());

  const row = rows[0] as ArtworkRow | undefined;
  return row ? mapRow(row) : undefined;
}

export async function slugExists(slug: string) {
  const { rows } = await sql`select 1 from artworks where slug = ${slug} limit 1`.execute(
    getKysely(),
  );
  return rows.length > 0;
}

export async function bulkInsertArtworks(records: ArtworkRecord[]) {
  await getKysely()
    .transaction()
    .execute(async (trx) => {
      for (const record of records) {
        await insertArtwork(record, trx);
      }
    });
}
