import { getDb } from './db.server';

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

export function insertArtwork(record: ArtworkRecord) {
  const db = getDb();
  db.prepare(
    `insert into artworks (
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
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    record.id,
    record.slug,
    record.title,
    record.categoryId,
    record.description,
    record.alt,
    record.originalFilename,
    record.storagePath,
    record.cdnUrl,
    record.contentType,
    record.width,
    record.height,
    record.sizeBytes,
    record.checksumSha256,
    record.sortOrder,
    record.status,
    record.createdAt,
    record.updatedAt,
  );

  return record;
}

export function listArtworkRecords() {
  const db = getDb();
  const rows = db
    .prepare(
      `select
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
      from artworks
      inner join artwork_categories on artwork_categories.id = artworks.category_id
      order by artworks.created_at desc, artworks.sort_order desc, artworks.title asc`,
    )
    .all() as ArtworkRow[];

  return rows.map(mapRow);
}

export function getArtworkByStoragePath(storagePath: string) {
  const db = getDb();
  const row = db
    .prepare(
      `select
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
      from artworks
      inner join artwork_categories on artwork_categories.id = artworks.category_id
      where artworks.storage_path = ?
      limit 1`,
    )
    .get(storagePath) as ArtworkRow | undefined;

  return row ? mapRow(row) : undefined;
}

export function slugExists(slug: string) {
  const db = getDb();
  const row = db.prepare('select 1 from artworks where slug = ? limit 1').get(slug);
  return row !== undefined;
}

export function bulkInsertArtworks(records: ArtworkRecord[]) {
  const db = getDb();
  const insertMany = db.transaction((items: ArtworkRecord[]) => {
    for (const record of items) {
      insertArtwork(record);
    }
  });

  insertMany(records);
}
