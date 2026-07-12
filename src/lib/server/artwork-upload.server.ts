import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

import { imageSize } from 'image-size';

import type {
  AdminDashboardData,
  BulkArtworkUploadError,
  BulkArtworkUploadResult,
} from '../shared/artwork-upload.types';
import type {
  ArtworkMetadataUpdate,
  ArtworkRecord,
  ArtworkStatus,
  ExistingArtworkInput,
} from '../shared/artworks.types';
import { normalizeArtworkStatus, parseInteger, slugify } from '../shared/utils';
import { toAboutContent } from './about.server';
import {
  buildBulkErrors,
  buildCategoryResolver,
  getUniqueArtworkSlug,
  normalizeFilename,
  parseCsvRows,
  resolveActiveCategory,
  validateCsvHeaders,
  type ParsedCsvRow,
} from './artwork-upload.helpers';
import {
  bulkInsertArtworks,
  deleteArtworkById,
  getArtworkById,
  getArtworkByStoragePath,
  insertArtwork,
  listArtworkRecords,
  updateArtworkMetadata,
} from './artworks.server';
import { requireAdminFromRequest } from './auth-session.server';
import {
  deleteFromBunnyStorage,
  downloadFromBunnyStorage,
  getBunnyCdnUrl,
  listBunnyStorageFiles,
  uploadToBunnyStorage,
} from './bunny.server';
import { listCategories } from './categories.server';
import { ensureSchema } from './db.server';
import { getSiteSettings } from './site-settings.server';

type BulkPreparationResult =
  | {
      errors: BulkArtworkUploadError[];
    }
  | {
      preparedRows: PreparedBulkRow[];
    };

type PreparedBulkRow = {
  file: File;
  record: ArtworkRecord;
};

type ImageMeta = {
  width: number;
  height: number;
  checksumSha256: string;
  contentType: string;
  sizeBytes: number;
  extension: 'jpg' | 'png' | 'webp';
};

function extensionFromContentType(contentType: string): ImageMeta['extension'] | null {
  const extensionByMime: Record<string, ImageMeta['extension']> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return extensionByMime[contentType] ?? null;
}

export function contentTypeFromExtension(
  name: string,
): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  switch (path.extname(name).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    default:
      return null;
  }
}

function validateImageFile(file: File) {
  if (file.size === 0) {
    throw new Error(`File ${file.name} is empty`);
  }
  if (file.size > 50_000_000) {
    throw new Error(`File ${file.name} is larger than 50MB`);
  }

  const contentType = file.type || '';
  if (!extensionFromContentType(contentType)) {
    throw new Error(`File ${file.name} must be a JPEG, PNG, or WebP image`);
  }

  return contentType;
}

export function readImageMetaFromBuffer(
  buffer: Buffer,
  opts: { contentType: string; name: string },
): ImageMeta {
  if (buffer.length === 0) {
    throw new Error(`File ${opts.name} is empty`);
  }
  const extension = extensionFromContentType(opts.contentType);
  if (!extension) {
    throw new Error(`File ${opts.name} must be a JPEG, PNG, or WebP image`);
  }
  const dimensions = imageSize(buffer);
  if (typeof dimensions.width !== 'number' || typeof dimensions.height !== 'number') {
    throw new Error(`Could not read dimensions for ${opts.name}`);
  }

  return {
    width: dimensions.width,
    height: dimensions.height,
    checksumSha256: createHash('sha256').update(buffer).digest('hex').toUpperCase(),
    contentType: opts.contentType,
    sizeBytes: buffer.byteLength,
    extension,
  };
}

async function readImageMeta(file: File) {
  const contentType = validateImageFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    ...readImageMetaFromBuffer(buffer, { contentType, name: file.name }),
    file,
  };
}

export function buildStoragePath(slug: string, extension: 'jpg' | 'png' | 'webp') {
  const shortId = randomUUID().replaceAll('-', '').slice(0, 8);
  return `artworks/${slug}-${shortId}.${extension}`;
}

function getBaseSlug(title: string) {
  // ponytail: slug is derived from the first 3 words of the title (user never provides it).
  const firstThreeWords = title.trim().split(/\s+/).slice(0, 3).join(' ');
  return slugify(firstThreeWords);
}

function mapFormDataFile(value: FormDataEntryValue | null, label: string) {
  if (!(value instanceof File)) {
    throw new Error(`${label} is required`);
  }
  return value;
}

async function prepareSingleArtwork(formData: FormData) {
  await requireAdminFromRequest();

  const file = mapFormDataFile(formData.get('file'), 'File to upload');
  const title = formData.get('title')?.toString().trim() ?? '';
  const categoryId = formData.get('category_id')?.toString().trim() ?? '';
  const description = formData.get('description')?.toString().trim() || undefined;
  const alt = formData.get('alt')?.toString().trim() || title;
  const sortOrder = parseInteger(formData.get('sort_order'), {
    fallback: 0,
    errorMessage: 'Artwork sort order must be an integer',
  });
  const status = normalizeArtworkStatus(formData.get('status'));

  if (title.length === 0) {
    throw new Error('Title is required');
  }

  const category = await getActiveCategory(categoryId);
  const imageMeta = await readImageMeta(file);
  const record = await prepareArtworkRecord({
    title,
    category: { id: category.id, label: category.label },
    imageMeta,
    description: description || null,
    alt,
    originalFilename: file.name,
    sortOrder,
    status,
  });

  return { file, record };
}

function createArtworkRecord(input: {
  title: string;
  category: ArtworkRecord['category'];
  slug: string;
  storagePath: string;
  cdnUrl: string;
  imageMeta: ImageMeta;
  description: string | null;
  alt: string;
  originalFilename: string;
  sortOrder: number;
  status: ArtworkStatus;
}) {
  const timestamp = new Date().toISOString();
  return {
    id: randomUUID(),
    slug: input.slug,
    title: input.title,
    categoryId: input.category.id,
    category: input.category,
    description: input.description,
    alt: input.alt,
    originalFilename: input.originalFilename,
    storagePath: input.storagePath,
    cdnUrl: input.cdnUrl,
    contentType: input.imageMeta.contentType,
    width: input.imageMeta.width,
    height: input.imageMeta.height,
    sizeBytes: input.imageMeta.sizeBytes,
    checksumSha256: input.imageMeta.checksumSha256,
    sortOrder: input.sortOrder,
    status: input.status,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies ArtworkRecord;
}

async function getActiveCategory(categoryId: string) {
  const category = (await listCategories({ includeArchived: true })).find(
    (entry) => entry.id === categoryId,
  );
  if (!category) {
    throw new Error('Select an active category');
  }
  if (category.status !== 'active') {
    throw new Error('Selected category is archived');
  }
  return category;
}

async function prepareArtworkRecord(
  input: {
    title: string;
    category: ArtworkRecord['category'];
    imageMeta: ImageMeta;
    storagePath?: string;
    description: string | null;
    alt: string;
    originalFilename: string;
    sortOrder: number;
    status: ArtworkStatus;
  },
  reservedSlugs?: Set<string>,
) {
  const baseSlug = getBaseSlug(input.title);
  if (!baseSlug) {
    throw new Error('Unable to create a slug for this file');
  }

  const slug = await getUniqueArtworkSlug(baseSlug, reservedSlugs);
  const storagePath = input.storagePath ?? buildStoragePath(slug, input.imageMeta.extension);

  return createArtworkRecord({
    ...input,
    slug,
    storagePath,
    cdnUrl: getBunnyCdnUrl(storagePath),
  });
}

export async function listAdminDashboard() {
  await ensureSchema();
  await requireAdminFromRequest();

  const [records, storageFiles, allCategories, siteSettings] = await Promise.all([
    listArtworkRecords(),
    listBunnyStorageFiles(),
    listCategories({ includeArchived: true }),
    getSiteSettings(),
  ]);
  const activeCategories = allCategories.filter((category) => category.status === 'active');
  const archivedCategories = allCategories.filter((category) => category.status === 'archived');

  return {
    dashboard: {
      records,
      storageFiles,
      activeCategories,
    },
    archivedCategories,
    demoMode: siteSettings.demoMode,
    about: toAboutContent(siteSettings),
  } satisfies AdminDashboardData;
}

export async function deleteArtworkWithStorage(id: string) {
  await ensureSchema();

  const record = await getArtworkById(id);
  if (!record) {
    throw new Error('Artwork not found');
  }

  await deleteFromBunnyStorage(record.storagePath);
  await deleteArtworkById(record.id);

  return record;
}

export async function deleteArtwork(id: string) {
  await requireAdminFromRequest();
  return deleteArtworkWithStorage(id);
}

export async function uploadSingleArtwork(formData: FormData) {
  await ensureSchema();
  const { file, record } = await prepareSingleArtwork(formData);

  await uploadToBunnyStorage({
    storagePath: record.storagePath,
    file,
    contentType: record.contentType,
    checksumSha256: record.checksumSha256,
  });

  try {
    return await insertArtwork(record);
  } catch (error) {
    await deleteFromBunnyStorage(record.storagePath);
    throw error;
  }
}

export async function prepareExistingArtworkRecord(
  input: ExistingArtworkInput,
): Promise<ArtworkRecord> {
  const contentType = contentTypeFromExtension(input.storagePath);
  if (!contentType) {
    throw new Error('Only JPEG, PNG, or WebP images can be linked');
  }

  const category = await getActiveCategory(input.categoryId);

  if (await getArtworkByStoragePath(input.storagePath)) {
    throw new Error('This storage path is already linked to a record');
  }

  const { buffer } = await downloadFromBunnyStorage(input.storagePath);
  const imageMeta = readImageMetaFromBuffer(buffer, { contentType, name: input.storagePath });

  return prepareArtworkRecord({
    title: input.title,
    category: { id: category.id, label: category.label },
    storagePath: input.storagePath,
    imageMeta,
    description: input.description,
    alt: input.alt ?? input.title,
    originalFilename: path.basename(input.storagePath),
    sortOrder: input.sortOrder,
    status: input.status,
  });
}

export async function registerExistingArtwork(input: ExistingArtworkInput) {
  await requireAdminFromRequest();
  await ensureSchema();
  const record = await prepareExistingArtworkRecord(input);
  return insertArtwork(record);
}

export async function updateArtworkRecord(input: ArtworkMetadataUpdate) {
  await ensureSchema();

  const existing = await getArtworkById(input.id);
  if (!existing) {
    throw new Error('Artwork not found');
  }

  const category = (await listCategories({ includeArchived: true })).find(
    (entry) => entry.id === input.categoryId,
  );
  if (!category) {
    throw new Error('Select a valid category');
  }
  if (category.status !== 'active' && category.id !== existing.categoryId) {
    throw new Error('Selected category is archived');
  }

  return updateArtworkMetadata(input);
}

export async function updateArtwork(input: ArtworkMetadataUpdate) {
  await requireAdminFromRequest();
  return updateArtworkRecord(input);
}

function parseBulkRows(formData: FormData) {
  const csvFile = mapFormDataFile(formData.get('csv'), 'CSV file');
  const fileValues = formData
    .getAll('files')
    .filter((value): value is File => value instanceof File);

  if (fileValues.length === 0) {
    throw new Error('Select at least one image file');
  }

  return { csvFile, fileValues };
}

async function prepareBulkRows(formData: FormData): Promise<BulkPreparationResult> {
  await requireAdminFromRequest();

  const { csvFile, fileValues } = parseBulkRows(formData);
  const csvText = await csvFile.text();
  const parsedRows = parseCsvRows(csvText);
  validateCsvHeaders(parsedRows);

  const rows: ParsedCsvRow[] = parsedRows.map((row) => ({
    row: row.row,
    filename: row.filename?.toString() ?? '',
    title: row.title?.toString() ?? '',
    categoryId: row.category_id?.toString().trim() ?? '',
    alt: row.alt?.toString().trim() || undefined,
    description: row.description?.toString().trim() || undefined,
    sortOrder:
      row.sort_order?.toString().trim() === '' || row.sort_order === undefined
        ? undefined
        : Number(row.sort_order),
    status: row.status?.toString().trim() || undefined,
  }));

  const resolveCategory = buildCategoryResolver(await listCategories({ includeArchived: true }));
  const errors = buildBulkErrors(rows, fileValues, resolveCategory);

  if (errors.length > 0) {
    return { errors };
  }

  const reservedSlugs = new Set<string>();
  const filesByName = new Map(fileValues.map((file) => [normalizeFilename(file.name), file]));
  const preparedRows: PreparedBulkRow[] = [];

  for (const row of rows) {
    const filename = normalizeFilename(row.filename);
    const file = filesByName.get(filename);
    if (!file) {
      return {
        errors: [{ row: row.row, filename, message: `Missing uploaded file ${filename}` }],
      };
    }

    const categoryResult = resolveActiveCategory(row.categoryId, resolveCategory);
    if (!('category' in categoryResult)) {
      return {
        errors: [{ row: row.row, filename, message: categoryResult.message }],
      };
    }
    const { category } = categoryResult;

    const imageMeta = await readImageMeta(file);

    try {
      const record = await prepareArtworkRecord(
        {
          title: row.title,
          category: { id: category.id, label: category.label },
          imageMeta,
          description: row.description?.trim() ?? '',
          alt: row.alt?.trim() ?? '',
          originalFilename: file.name,
          sortOrder: row.sortOrder ?? 0,
          status: normalizeArtworkStatus(row.status),
        },
        reservedSlugs,
      );
      preparedRows.push({ file, record });
    } catch (error) {
      return {
        errors: [
          {
            row: row.row,
            filename,
            message: error instanceof Error ? error.message : 'Unable to prepare artwork',
          },
        ],
      };
    }
  }

  return { preparedRows };
}

export async function uploadBulkArtworks(formData: FormData): Promise<BulkArtworkUploadResult> {
  await ensureSchema();
  const prepared = await prepareBulkRows(formData);
  if ('errors' in prepared) {
    return { ok: false, errors: prepared.errors };
  }

  const uploadedPaths: string[] = [];
  const records: ArtworkRecord[] = [];

  try {
    for (const { file, record } of prepared.preparedRows) {
      await uploadToBunnyStorage({
        storagePath: record.storagePath,
        file,
        contentType: record.contentType,
        checksumSha256: record.checksumSha256,
      });
      uploadedPaths.push(record.storagePath);
      records.push(record);
    }
  } catch (error) {
    const cleanupResults = await Promise.allSettled(
      uploadedPaths.map((storagePath) => deleteFromBunnyStorage(storagePath)),
    );
    const cleanupFailures = cleanupResults.filter((result) => result.status === 'rejected').length;
    throw new Error(
      `Bulk upload failed after storing ${uploadedPaths.length} of ${prepared.preparedRows.length} files. Rolled back ${uploadedPaths.length} file(s)${cleanupFailures ? `; ${cleanupFailures} cleanup delete(s) failed` : ''}.`,
      { cause: error },
    );
  }

  try {
    await bulkInsertArtworks(records);
    return { ok: true, insertedCount: records.length, records };
  } catch (error) {
    const cleanupResults = await Promise.allSettled(
      records.map((record) => deleteFromBunnyStorage(record.storagePath)),
    );
    const cleanupFailures = cleanupResults.filter((result) => result.status === 'rejected').length;
    throw new Error(
      `Bulk insert failed after storing ${records.length} file(s). Rolled back ${records.length} file(s)${cleanupFailures ? `; ${cleanupFailures} cleanup delete(s) failed` : ''}.`,
      { cause: error },
    );
  }
}
