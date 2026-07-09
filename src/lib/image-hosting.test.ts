import { createHash } from 'node:crypto';

import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildBulkErrors,
  buildCategoryResolver,
  getUniqueArtworkSlug,
  parseCsvRows,
} from '@/lib/artwork-upload.helpers';
import {
  buildStoragePath,
  contentTypeFromExtension,
  deleteArtworkWithStorage,
  prepareExistingArtworkRecord,
  readImageMetaFromBuffer,
} from '@/lib/artwork-upload.server';
import {
  getArtworkById,
  insertArtwork,
  updateArtworkMetadata,
  type ArtworkRecord,
} from '@/lib/artworks.server';
import { buildBunnyCdnUrl } from '@/lib/bunny';
import { addCategory, listCategories, resolveCategoryInput } from '@/lib/categories.server';
import { ensureSchema, getKysely } from '@/lib/db.server';

const seededCategoryIds = [
  'illustration',
  'fine-art-collage',
  'graphic-design',
  'food',
  'botanical-illustration',
  'special-projects',
];

async function resetDatabase() {
  await ensureSchema();
  await sql`truncate table artworks`.execute(getKysely());
  await sql`delete from artwork_categories where id not in (${sql.join(
    seededCategoryIds.map((id) => sql`${id}`),
  )})`.execute(getKysely());
}

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function createTestArtwork(overrides: Partial<ArtworkRecord> = {}) {
  const timestamp = new Date('2026-01-01T00:00:00.000Z').toISOString();
  return {
    id: 'test-artwork-id',
    slug: 'test-artwork',
    title: 'Test Artwork',
    categoryId: 'fine-art-collage',
    category: {
      id: 'fine-art-collage',
      label: 'Fine Art Collage',
    },
    description: 'A test artwork.',
    alt: 'Test artwork alt text',
    originalFilename: 'test-artwork.jpg',
    storagePath: 'artworks/test-artwork.jpg',
    cdnUrl: 'https://carla.b-cdn.net/artworks/test-artwork.jpg',
    contentType: 'image/jpeg',
    width: 800,
    height: 600,
    sizeBytes: 12345,
    checksumSha256: 'ABC123',
    sortOrder: 0,
    status: 'published',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  } satisfies ArtworkRecord;
}

function stubBunnyDelete(status: number) {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('buildBunnyCdnUrl', () => {
  it('appends optimization params once', () => {
    expect(
      buildBunnyCdnUrl('https://carla.b-cdn.net/artworks/2026/test.jpg', {
        width: 800,
        format: 'webp',
      }),
    ).toBe('https://carla.b-cdn.net/artworks/2026/test.jpg?width=800&format=webp');
  });
});

describe('artwork deletion', () => {
  it('deletes Bunny storage before deleting the database record', async () => {
    const record = createTestArtwork();
    await insertArtwork(record);
    const fetchMock = stubBunnyDelete(204);

    await expect(deleteArtworkWithStorage(record.id)).resolves.toMatchObject({ id: record.id });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3999/test-zone/artworks/test-artwork.jpg',
      expect.objectContaining({ method: 'DELETE' }),
    );
    await expect(getArtworkById(record.id)).resolves.toBeUndefined();
  });

  it('deletes the database record when Bunny storage is already missing', async () => {
    const record = createTestArtwork();
    await insertArtwork(record);
    stubBunnyDelete(404);

    await deleteArtworkWithStorage(record.id);

    await expect(getArtworkById(record.id)).resolves.toBeUndefined();
  });

  it('keeps the database record when Bunny storage deletion fails', async () => {
    const record = createTestArtwork();
    await insertArtwork(record);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('Bunny failed', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteArtworkWithStorage(record.id)).rejects.toThrow(
      'Bunny storage delete failed with 500',
    );

    await expect(getArtworkById(record.id)).resolves.toMatchObject({ id: record.id });
  });

  it('reports missing artwork ids without calling Bunny storage', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    await expect(deleteArtworkWithStorage('missing-artwork-id')).rejects.toThrow('Artwork not found');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('artwork metadata updates', () => {
  it('updates editable fields without moving or renaming the Bunny object', async () => {
    const record = createTestArtwork();
    await insertArtwork(record);

    const updated = await updateArtworkMetadata({
      id: record.id,
      title: 'Updated Artwork',
      categoryId: 'botanical-illustration',
      description: null,
      alt: 'Updated alt text',
      sortOrder: 42,
      status: 'draft',
    });

    expect(updated).toMatchObject({
      id: record.id,
      title: 'Updated Artwork',
      categoryId: 'botanical-illustration',
      category: {
        id: 'botanical-illustration',
        label: 'Botanical Illustration',
      },
      description: null,
      alt: 'Updated alt text',
      sortOrder: 42,
      status: 'draft',
      slug: record.slug,
      originalFilename: record.originalFilename,
      storagePath: record.storagePath,
      cdnUrl: record.cdnUrl,
      contentType: record.contentType,
      width: record.width,
      height: record.height,
      sizeBytes: record.sizeBytes,
      checksumSha256: record.checksumSha256,
      createdAt: record.createdAt,
    });
    expect(updated.updatedAt).not.toBe(record.updatedAt);
  });

  it('reports missing artwork ids when updating metadata', async () => {
    await expect(
      updateArtworkMetadata({
        id: 'missing-artwork-id',
        title: 'Missing',
        categoryId: 'illustration',
        description: null,
        alt: 'Missing',
        sortOrder: 0,
        status: 'draft',
      }),
    ).rejects.toThrow('Artwork not found');
  });
});

describe('category storage', () => {
  it('resolves seeded category ids and labels', async () => {
    expect((await resolveCategoryInput('fine-art-collage'))?.id).toBe('fine-art-collage');
    expect((await resolveCategoryInput('Fine Art Collage'))?.id).toBe('fine-art-collage');
  });

  it('rejects duplicate category ids and labels', async () => {
    await addCategory({ label: 'Test Category' });

    await expect(addCategory({ label: 'Test-Category' })).rejects.toThrow('Category id already exists');
    await expect(addCategory({ label: 'test category' })).rejects.toThrow(
      'Category label already exists',
    );
  });

  it('lists active categories in sort order', async () => {
    await addCategory({ label: 'Zeta Category', sortOrder: 70 });
    await addCategory({ label: 'Alpha Category', sortOrder: 65 });

    expect(
      (await listCategories())
        .map((category) => category.id)
        .slice(-2),
    ).toEqual(['alpha-category', 'zeta-category']);
  });
});

describe('csv and slug helpers', () => {
  it('normalizes category ids from csv row values', async () => {
    const rows = parseCsvRows(
      `filename,title,category_id\nfirst.jpg,First,fine-art-collage\nsecond.jpg,Second,Fine Art Collage`,
    );
    const resolved = await Promise.all(
      rows.map((row) => resolveCategoryInput(String(row.category_id))),
    );
    expect(resolved.map((category) => category?.id)).toEqual([
      'fine-art-collage',
      'fine-art-collage',
    ]);
  });

  it('reports missing files and duplicate filenames before upload', async () => {
    const rows = [
      {
        row: 2,
        filename: 'blue-bird.jpg',
        title: 'Blue Bird',
        categoryId: 'illustration',
        alt: 'Blue bird illustration',
        description: 'A blue bird illustration.',
        sortOrder: 0,
        status: 'draft',
      },
      {
        row: 3,
        filename: 'blue-bird.jpg',
        title: 'Blue Bird 2',
        categoryId: 'illustration',
        alt: 'Second blue bird',
        description: 'Another blue bird illustration.',
        sortOrder: 1,
        status: 'draft',
      },
    ] satisfies Parameters<typeof buildBulkErrors>[0];

    const resolveCategory = buildCategoryResolver(await listCategories({ includeArchived: true }));

    const duplicateErrors = buildBulkErrors(
      rows,
      [new File(['x'], 'blue-bird.jpg', { type: 'image/jpeg' })],
      resolveCategory,
    );
    expect(
      duplicateErrors.some((error) => error.message.includes('Duplicate filename blue-bird.jpg')),
    ).toBe(true);

    const missingErrors = buildBulkErrors(rows.slice(0, 1), [], resolveCategory);
    expect(
      missingErrors.some((error) => error.message.includes('Missing uploaded file blue-bird.jpg')),
    ).toBe(true);
  });

  it('appends numeric suffixes to conflicting slugs', async () => {
    expect(await getUniqueArtworkSlug('blue-bird', new Set(['blue-bird']))).toBe('blue-bird-2');
    expect(await getUniqueArtworkSlug('blue-bird', new Set(['blue-bird', 'blue-bird-2']))).toBe(
      'blue-bird-3',
    );
  });
});

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

describe('artwork storage paths', () => {
  it('stores new uploads under the artworks prefix', () => {
    const storagePath = buildStoragePath('blue-bird', 'webp');

    expect(storagePath).toMatch(/^artworks\/blue-bird-[a-f0-9]{8}\.webp$/);
  });
});

describe('linking existing Bunny images', () => {
  it('maps file extensions to content types', () => {
    expect(contentTypeFromExtension('photo.jpg')).toBe('image/jpeg');
    expect(contentTypeFromExtension('photo.JPEG')).toBe('image/jpeg');
    expect(contentTypeFromExtension('photo.png')).toBe('image/png');
    expect(contentTypeFromExtension('photo.webp')).toBe('image/webp');
    expect(contentTypeFromExtension('photo.gif')).toBeNull();
    expect(contentTypeFromExtension('photo')).toBeNull();
  });

  it('reads dimensions and checksum from an image buffer', () => {
    const meta = readImageMetaFromBuffer(ONE_PIXEL_PNG, {
      contentType: 'image/png',
      name: 'pixel.png',
    });
    expect(meta).toMatchObject({
      width: 1,
      height: 1,
      contentType: 'image/png',
      sizeBytes: ONE_PIXEL_PNG.length,
      extension: 'png',
    });
    expect(meta.checksumSha256).toBe(
      createHash('sha256').update(ONE_PIXEL_PNG).digest('hex').toUpperCase(),
    );
  });

  it('builds a record from an existing Bunny object without uploading', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(ONE_PIXEL_PNG, { status: 200, headers: { 'content-type': 'image/png' } }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const record = await prepareExistingArtworkRecord({
      storagePath: 'artworks/blue-bird.png',
      title: 'Blue Bird',
      categoryId: 'illustration',
      alt: null,
      description: null,
      sortOrder: 0,
      status: 'draft',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3999/test-zone/artworks/blue-bird.png',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(record).toMatchObject({
      storagePath: 'artworks/blue-bird.png',
      cdnUrl: 'https://carla.b-cdn.net/artworks/blue-bird.png',
      originalFilename: 'blue-bird.png',
      contentType: 'image/png',
      width: 1,
      height: 1,
      sizeBytes: ONE_PIXEL_PNG.length,
      slug: 'blue-bird',
      alt: 'Blue Bird',
    });
    expect(record.checksumSha256).toBe(
      createHash('sha256').update(ONE_PIXEL_PNG).digest('hex').toUpperCase(),
    );
  });

  it('rejects an already-tracked storage path', async () => {
    await insertArtwork(
      createTestArtwork({
        storagePath: 'artworks/taken.png',
        cdnUrl: 'https://carla.b-cdn.net/artworks/taken.png',
      }),
    );
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      prepareExistingArtworkRecord({
        storagePath: 'artworks/taken.png',
        title: 'Taken',
        categoryId: 'illustration',
        alt: null,
        description: null,
        sortOrder: 0,
        status: 'draft',
      }),
    ).rejects.toThrow('already linked');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported file extensions without fetching', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      prepareExistingArtworkRecord({
        storagePath: 'artworks/photo.gif',
        title: 'Gif',
        categoryId: 'illustration',
        alt: null,
        description: null,
        sortOrder: 0,
        status: 'draft',
      }),
    ).rejects.toThrow('Only JPEG, PNG, or WebP images can be linked');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
