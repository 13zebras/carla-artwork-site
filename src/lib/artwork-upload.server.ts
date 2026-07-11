import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';

import { createServerFn } from '@tanstack/react-start';
import { imageSize } from 'image-size';

import {
  buildBulkErrors,
  buildCategoryResolver,
  getUniqueArtworkSlug,
  normalizeFilename,
  parseCsvRows,
  validateCsvHeaders,
  type BulkArtworkUploadError,
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
  type ArtworkRecord,
  type ArtworkStatus,
} from './artworks.server';
import { requireAdminFromRequest } from './auth.server';
import { buildBunnyCdnUrl } from './bunny';
import {
  deleteFromBunnyStorage,
  downloadFromBunnyStorage,
  listBunnyStorageFiles,
  uploadToBunnyStorage,
  type BunnyStorageFile,
} from './bunny.server';
import { listCategories, type ArtworkCategoryRecord } from './categories.server';
import { ensureSchema } from './db.server';
import { getServerEnv } from './env.server';
import { getSiteSettings } from './site-settings.server';

export type AdminDashboardData = {
  dashboard: {
    records: ArtworkRecord[];
    storageFiles: BunnyStorageFile[];
    activeCategories: ArtworkCategoryRecord[];
  };
  archivedCategories: ArtworkCategoryRecord[];
  demoMode: boolean;
};

export type BulkArtworkUploadSuccess = {
  ok: true;
  insertedCount: number;
  records: ArtworkRecord[];
};

export type BulkArtworkUploadFailure = {
  ok: false;
  errors: BulkArtworkUploadError[];
};

export type BulkArtworkUploadResult = BulkArtworkUploadSuccess | BulkArtworkUploadFailure;

type BulkPreparationResult =
  | {
      errors: BulkArtworkUploadError[];
    }
  | {
      preparedRows: PreparedBulkRow[];
    };

type PreparedBulkRow = Omit<ParsedCsvRow, 'categoryId'> & {
  file: File;
  finalSlug: string;
  storagePath: string;
  cdnUrl: string;
  contentType: string;
  width: number;
  height: number;
  sizeBytes: number;
  checksumSha256: string;
  categoryId: string;
  category: ArtworkRecord['category'];
  descriptionValue: string;
  altValue: string;
  sortOrderValue: number;
  statusValue: ArtworkStatus;
};

type ImageMeta = {
  width: number;
  height: number;
  checksumSha256: string;
  contentType: string;
  sizeBytes: number;
  extension: 'jpg' | 'png' | 'webp';
};

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeStatus(value: FormDataEntryValue | string | undefined | null) {
  const normalized = value == null ? '' : value.toString().trim().toLowerCase();
  if (normalized === '' || normalized === 'draft') {
    return 'draft' as const;
  }
  if (normalized === 'published') {
    return 'published' as const;
  }
  throw new Error('Artwork status must be draft or published');
}

function parseSortOrder(value: FormDataEntryValue | string | undefined | null, fallback = 0) {
  if (value == null || value.toString().trim() === '') {
    return fallback;
  }

  const parsed = Number(value.toString());
  if (!Number.isInteger(parsed)) {
    throw new Error('Artwork sort order must be an integer');
  }

  return parsed;
}

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

function getImageMeta(file: File): ImageMeta {
  if (file.size === 0) {
    throw new Error(`File ${file.name} is empty`);
  }
  if (file.size > 50_000_000) {
    throw new Error(`File ${file.name} is larger than 50MB`);
  }

  const contentType = file.type || '';
  const extension = extensionFromContentType(contentType);
  if (!extension) {
    throw new Error(`File ${file.name} must be a JPEG, PNG, or WebP image`);
  }

  return { width: 0, height: 0, checksumSha256: '', contentType, sizeBytes: file.size, extension };
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
  const meta = getImageMeta(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const imageMeta = readImageMetaFromBuffer(buffer, {
    contentType: meta.contentType,
    name: file.name,
  });
  return { ...imageMeta, file };
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
  const sortOrder = parseSortOrder(formData.get('sort_order'));
  const status = normalizeStatus(formData.get('status'));

  if (title.length === 0) {
    throw new Error('Title is required');
  }

  const category = (await listCategories()).find((entry) => entry.id === categoryId);
  if (!category) {
    throw new Error('Select an active category');
  }

  const imageMeta = await readImageMeta(file);
  const baseSlug = getBaseSlug(title);
  if (!baseSlug) {
    throw new Error('Unable to create a slug for this file');
  }

  const takenSlugs = new Set((await listArtworkRecords()).map((record) => record.slug));
  const slug = await getUniqueArtworkSlug(baseSlug, takenSlugs);
  const storagePath = buildStoragePath(slug, imageMeta.extension);
  const cdnUrl = buildBunnyCdnUrl(getServerEnv().BUNNY_CDN_BASE_URL + `/${storagePath}`);
  const categorySummary = {
    id: category.id,
    label: category.label,
  };

  return {
    file,
    title,
    category: categorySummary,
    slug,
    storagePath,
    cdnUrl,
    imageMeta,
    description: description || null,
    alt,
    sortOrder,
    status,
  };
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

export const listAdminDashboard = createServerFn({ method: 'GET' }).handler(async () => {
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
  } satisfies AdminDashboardData;
});

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

export const deleteArtwork = createServerFn({ method: 'POST' })
  .validator((data) => {
    const id =
      data && typeof data === 'object' && 'id' in data && typeof data.id === 'string'
        ? data.id.trim()
        : '';
    if (id.length === 0) {
      throw new Error('Artwork id is required');
    }
    return { id };
  })
  .handler(async ({ data }) => {
    await requireAdminFromRequest();
    return deleteArtworkWithStorage(data.id);
  });

export const uploadSingleArtwork = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    return data;
  })
  .handler(async ({ data }) => {
    await ensureSchema();
    const prepared = await prepareSingleArtwork(data);
    const record = createArtworkRecord({
      title: prepared.title,
      category: prepared.category,
      slug: prepared.slug,
      storagePath: prepared.storagePath,
      cdnUrl: prepared.cdnUrl,
      imageMeta: prepared.imageMeta,
      description: prepared.description,
      alt: prepared.alt,
      originalFilename: prepared.file.name,
      sortOrder: prepared.sortOrder,
      status: prepared.status,
    });

    await uploadToBunnyStorage({
      storagePath: record.storagePath,
      file: prepared.file,
      contentType: record.contentType,
      checksumSha256: record.checksumSha256,
    });

    try {
      return await insertArtwork(record);
    } catch (error) {
      await deleteFromBunnyStorage(record.storagePath);
      throw error;
    }
  });

export async function prepareExistingArtworkRecord(input: {
  storagePath: string;
  title: string;
  categoryId: string;
  alt: string | null;
  description: string | null;
  sortOrder: number;
  status: ArtworkStatus;
}): Promise<ArtworkRecord> {
  const contentType = contentTypeFromExtension(input.storagePath);
  if (!contentType) {
    throw new Error('Only JPEG, PNG, or WebP images can be linked');
  }

  const category = (await listCategories()).find((entry) => entry.id === input.categoryId);
  if (!category) {
    throw new Error('Select an active category');
  }
  if (category.status !== 'active') {
    throw new Error('Selected category is archived');
  }

  if (await getArtworkByStoragePath(input.storagePath)) {
    throw new Error('This storage path is already linked to a record');
  }

  const { buffer } = await downloadFromBunnyStorage(input.storagePath);
  const imageMeta = readImageMetaFromBuffer(buffer, { contentType, name: input.storagePath });

  const baseSlug = getBaseSlug(input.title);
  if (!baseSlug) {
    throw new Error('Unable to create a slug for this file');
  }
  const takenSlugs = new Set((await listArtworkRecords()).map((record) => record.slug));
  const slug = await getUniqueArtworkSlug(baseSlug, takenSlugs);
  const cdnUrl = buildBunnyCdnUrl(`${getServerEnv().BUNNY_CDN_BASE_URL}/${input.storagePath}`);

  return createArtworkRecord({
    title: input.title,
    category: { id: category.id, label: category.label },
    slug,
    storagePath: input.storagePath,
    cdnUrl,
    imageMeta,
    description: input.description,
    alt: input.alt ?? input.title,
    originalFilename: path.basename(input.storagePath),
    sortOrder: input.sortOrder,
    status: input.status,
  });
}

function parseRegisterExistingInput(data: unknown) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request');
  }
  const obj = data as Record<string, unknown>;
  const storagePath = typeof obj.storagePath === 'string' ? obj.storagePath.trim() : '';
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const categoryId = typeof obj.categoryId === 'string' ? obj.categoryId.trim() : '';
  const altRaw = typeof obj.alt === 'string' ? obj.alt.trim() : '';
  const descriptionRaw = typeof obj.description === 'string' ? obj.description.trim() : '';
  const sortOrderValue =
    obj.sortOrder === undefined || obj.sortOrder === null || obj.sortOrder === ''
      ? 0
      : Number(obj.sortOrder);

  if (storagePath.length === 0) {
    throw new Error('Storage path is required');
  }
  if (title.length === 0) {
    throw new Error('Title is required');
  }
  if (categoryId.length === 0) {
    throw new Error('Category is required');
  }
  if (!Number.isInteger(sortOrderValue)) {
    throw new Error('Artwork sort order must be an integer');
  }

  return {
    storagePath,
    title,
    categoryId,
    alt: altRaw || null,
    description: descriptionRaw || null,
    sortOrder: sortOrderValue,
    status: normalizeStatus(typeof obj.status === 'string' ? obj.status : undefined),
  };
}

export const registerExistingArtwork = createServerFn({ method: 'POST' })
  .validator((data) => parseRegisterExistingInput(data))
  .handler(async ({ data }) => {
    await requireAdminFromRequest();
    await ensureSchema();
    const record = await prepareExistingArtworkRecord(data);
    return insertArtwork(record);
  });

function parseUpdateArtworkInput(data: unknown) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request');
  }

  const obj = data as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const categoryId = typeof obj.categoryId === 'string' ? obj.categoryId.trim() : '';
  const altRaw = typeof obj.alt === 'string' ? obj.alt.trim() : '';
  const descriptionRaw = typeof obj.description === 'string' ? obj.description.trim() : '';
  const sortOrderValue =
    obj.sortOrder === undefined || obj.sortOrder === null || obj.sortOrder === ''
      ? 0
      : Number(obj.sortOrder);

  if (id.length === 0) {
    throw new Error('Artwork id is required');
  }
  if (title.length === 0) {
    throw new Error('Title is required');
  }
  if (categoryId.length === 0) {
    throw new Error('Category is required');
  }
  if (!Number.isInteger(sortOrderValue)) {
    throw new Error('Artwork sort order must be an integer');
  }

  return {
    id,
    title,
    categoryId,
    alt: altRaw || title,
    description: descriptionRaw || null,
    sortOrder: sortOrderValue,
    status: normalizeStatus(typeof obj.status === 'string' ? obj.status : undefined),
  };
}

export async function updateArtworkRecord(input: ReturnType<typeof parseUpdateArtworkInput>) {
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

export const updateArtwork = createServerFn({ method: 'POST' })
  .validator((data) => parseUpdateArtworkInput(data))
  .handler(async ({ data }) => {
    await requireAdminFromRequest();
    return updateArtworkRecord(data);
  });

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

  const existingSlugs = new Set((await listArtworkRecords()).map((record) => record.slug));
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

    const category = resolveCategory(row.categoryId);
    if (!category || category.status !== 'active') {
      return {
        errors: [{ row: row.row, filename, message: `Unknown category: ${row.categoryId}` }],
      };
    }

    const imageMeta = await readImageMeta(file);
    const baseSlug = getBaseSlug(row.title);
    if (!baseSlug) {
      return {
        errors: [
          {
            row: row.row,
            filename: normalizeFilename(row.filename),
            message: 'Unable to create a slug for this file',
          },
        ],
      };
    }

    const slug = await getUniqueArtworkSlug(baseSlug, existingSlugs);
    const storagePath = buildStoragePath(slug, imageMeta.extension);
    const cdnUrl = buildBunnyCdnUrl(`${getServerEnv().BUNNY_CDN_BASE_URL}/${storagePath}`);
    const categorySummary = {
      id: category.id,
      label: category.label,
    };

    preparedRows.push({
      ...row,
      file,
      finalSlug: slug,
      storagePath,
      cdnUrl,
      contentType: imageMeta.contentType,
      width: imageMeta.width,
      height: imageMeta.height,
      sizeBytes: imageMeta.sizeBytes,
      checksumSha256: imageMeta.checksumSha256,
      categoryId: category.id,
      category: categorySummary,
      descriptionValue: row.description?.trim() ?? '',
      altValue: row.alt?.trim() ?? '',
      sortOrderValue: row.sortOrder ?? 0,
      statusValue: normalizeStatus(row.status),
    });
  }

  return { preparedRows };
}

export const uploadBulkArtworks = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    return data;
  })
  .handler(async ({ data }): Promise<BulkArtworkUploadResult> => {
    await ensureSchema();
    const prepared = await prepareBulkRows(data);
    if ('errors' in prepared) {
      return { ok: false, errors: prepared.errors };
    }

    const uploadedPaths: string[] = [];
    const records: ArtworkRecord[] = [];

    try {
      for (const row of prepared.preparedRows) {
        const record = createArtworkRecord({
          title: row.title,
          category: row.category,
          slug: row.finalSlug,
          storagePath: row.storagePath,
          cdnUrl: row.cdnUrl,
          imageMeta: {
            width: row.width,
            height: row.height,
            checksumSha256: row.checksumSha256,
            contentType: row.contentType,
            sizeBytes: row.sizeBytes,
            extension:
              row.contentType === 'image/jpeg'
                ? 'jpg'
                : row.contentType === 'image/png'
                  ? 'png'
                  : 'webp',
          },
          description: row.descriptionValue,
          alt: row.altValue,
          originalFilename: row.file.name,
          sortOrder: row.sortOrderValue,
          status: row.statusValue,
        });

        await uploadToBunnyStorage({
          storagePath: record.storagePath,
          file: row.file,
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
      const cleanupFailures = cleanupResults.filter(
        (result) => result.status === 'rejected',
      ).length;
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
      const cleanupFailures = cleanupResults.filter(
        (result) => result.status === 'rejected',
      ).length;
      throw new Error(
        `Bulk insert failed after storing ${records.length} file(s). Rolled back ${records.length} file(s)${cleanupFailures ? `; ${cleanupFailures} cleanup delete(s) failed` : ''}.`,
        { cause: error },
      );
    }
  });
