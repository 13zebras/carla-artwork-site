import { createHash } from 'node:crypto';

import { sql } from 'kysely';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildAboutImageStoragePath, toAboutContent } from '@/lib/server/about.server';
import {
  buildBulkErrors,
  buildCategoryResolver,
  getUniqueArtworkSlug,
  parseCsvRows,
} from '@/lib/server/artwork-upload.helpers';
import {
  buildStoragePath,
  contentTypeFromExtension,
  deleteArtworkWithStorage,
  prepareExistingArtworkRecord,
  readImageMetaFromBuffer,
} from '@/lib/server/artwork-upload.server';
import {
  getArtworkById,
  insertArtwork,
  listPublishedArtworks,
  listPublishedArtworksByCategoryId,
  updateArtworkMetadata,
} from '@/lib/server/artworks.server';
import {
  addCategory,
  deleteCategoryById,
  getCategoryById,
  getCategoryBySlug,
  listCategories,
  resolveCategoryInput,
  updateCategory,
} from '@/lib/server/categories.server';
import { ensureSchema, getKysely } from '@/lib/server/db.server';
import {
  getSiteSettings,
  updateAboutSettings,
  updateDemoMode,
} from '@/lib/server/site-settings.server';
import type { ArtworkRecord } from '@/lib/shared/artworks.types';
import { buildBunnyCdnUrl } from '@/lib/shared/bunny';

async function resetDatabase() {
  await ensureSchema();
  // Truncate both tables in one statement so the FK from artworks -> artwork_categories
  // does not block truncating the referenced table.
  await sql`truncate table artworks, artwork_categories`.execute(getKysely());
  await sql`alter sequence artwork_category_id_seq restart with 1`.execute(getKysely());
  await updateDemoMode(false);
  await updateAboutSettings({
    aboutText: '',
    aboutMobileImagePath: null,
    aboutDesktopImagePath: null,
    aboutImageAlt: '',
  });
}

async function seedTestCategories() {
  await addCategory({ label: 'Illustration' });
  await addCategory({ label: 'Fine Art Collage' });
  await addCategory({ label: 'Botanical Illustration' });
}

beforeEach(async () => {
  await resetDatabase();
  await seedTestCategories();
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
    categoryId: 'c002',
    category: {
      id: 'c002',
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

    await expect(deleteArtworkWithStorage('missing-artwork-id')).rejects.toThrow(
      'Artwork not found',
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('public artwork listing', () => {
  it('returns published artwork in active categories in portfolio order', async () => {
    await updateCategory({
      id: 'c003',
      label: 'Botanical Illustration',
      status: 'archived',
    });

    const records = [
      createTestArtwork({
        id: 'later-artwork',
        slug: 'later-artwork',
        storagePath: 'artworks/later-artwork.jpg',
        cdnUrl: 'https://carla.b-cdn.net/artworks/later-artwork.jpg',
        sortOrder: 20,
      }),
      createTestArtwork({
        id: 'first-artwork',
        slug: 'first-artwork',
        storagePath: 'artworks/first-artwork.jpg',
        cdnUrl: 'https://carla.b-cdn.net/artworks/first-artwork.jpg',
        sortOrder: 10,
      }),
      createTestArtwork({
        id: 'draft-artwork',
        slug: 'draft-artwork',
        storagePath: 'artworks/draft-artwork.jpg',
        status: 'draft',
      }),
      createTestArtwork({
        id: 'archived-category-artwork',
        slug: 'archived-category-artwork',
        categoryId: 'c003',
        category: { id: 'c003', label: 'Botanical Illustration' },
        storagePath: 'artworks/archived-category-artwork.jpg',
      }),
    ];

    for (const record of records) {
      await insertArtwork(record);
    }

    const artworks = await listPublishedArtworks();

    expect(artworks.map((artwork) => artwork.slug)).toEqual(['first-artwork', 'later-artwork']);
    expect(artworks[0]).toEqual({
      slug: 'first-artwork',
      title: 'Test Artwork',
      category: {
        id: 'c002',
        categorySlug: 'fine-art-collage',
        label: 'Fine Art Collage',
      },
      cdnUrl: 'https://carla.b-cdn.net/artworks/first-artwork.jpg',
      alt: 'Test artwork alt text',
      width: 800,
      height: 600,
    });
  });

  it('returns only published artwork from the requested active category', async () => {
    const records = [
      createTestArtwork({
        id: 'target-later',
        slug: 'target-later',
        storagePath: 'artworks/target-later.jpg',
        sortOrder: 20,
      }),
      createTestArtwork({
        id: 'target-first',
        slug: 'target-first',
        storagePath: 'artworks/target-first.jpg',
        sortOrder: 10,
      }),
      createTestArtwork({
        id: 'target-draft',
        slug: 'target-draft',
        storagePath: 'artworks/target-draft.jpg',
        status: 'draft',
      }),
      createTestArtwork({
        id: 'other-category',
        slug: 'other-category',
        categoryId: 'c001',
        category: { id: 'c001', label: 'Illustration' },
        storagePath: 'artworks/other-category.jpg',
      }),
    ];

    for (const record of records) {
      await insertArtwork(record);
    }

    const artworks = await listPublishedArtworksByCategoryId('c002');

    expect(artworks.map((artwork) => artwork.slug)).toEqual(['target-first', 'target-later']);
    expect(artworks[0]?.category).toEqual({
      id: 'c002',
      categorySlug: 'fine-art-collage',
      label: 'Fine Art Collage',
    });

    await updateCategory({ id: 'c002', label: 'Fine Art Collage', status: 'archived' });
    await expect(listPublishedArtworksByCategoryId('c002')).resolves.toEqual([]);
  });
});

describe('site settings', () => {
  it('persists demo mode changes', async () => {
    await expect(getSiteSettings()).resolves.toMatchObject({ demoMode: false });

    const settings = await updateDemoMode(true);

    expect(settings.demoMode).toBe(true);
    await expect(getSiteSettings()).resolves.toMatchObject({ demoMode: true });
  });

  it('persists about content and responsive image details', async () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const settings = await updateAboutSettings({
      aboutText: text,
      aboutMobileImagePath: 'siteImages/about-page-photo-mobile.webp',
      aboutDesktopImagePath: 'siteImages/about-page-photo-desktop.jpg',
      aboutImageAlt: 'Carla working in her studio',
    });

    expect(settings).toMatchObject({
      aboutText: text,
      aboutMobileImagePath: 'siteImages/about-page-photo-mobile.webp',
      aboutDesktopImagePath: 'siteImages/about-page-photo-desktop.jpg',
      aboutImageAlt: 'Carla working in her studio',
    });
    expect(toAboutContent(settings)).toMatchObject({
      text,
      mobileImageUrl: expect.stringContaining('siteImages/about-page-photo-mobile.webp?v='),
      desktopImageUrl: expect.stringContaining('siteImages/about-page-photo-desktop.jpg?v='),
    });
  });

  it('builds stable Bunny paths for both about photos', () => {
    expect(buildAboutImageStoragePath('mobile', 'png')).toBe(
      'siteImages/about-page-photo-mobile.png',
    );
    expect(buildAboutImageStoragePath('desktop', 'webp')).toBe(
      'siteImages/about-page-photo-desktop.webp',
    );
  });
});

describe('artwork metadata updates', () => {
  it('updates editable fields without moving or renaming the Bunny object', async () => {
    const record = createTestArtwork();
    await insertArtwork(record);

    const updated = await updateArtworkMetadata({
      id: record.id,
      title: 'Updated Artwork',
      categoryId: 'c003',
      description: null,
      alt: 'Updated alt text',
      sortOrder: 42,
      status: 'draft',
    });

    expect(updated).toMatchObject({
      id: record.id,
      title: 'Updated Artwork',
      categoryId: 'c003',
      category: {
        id: 'c003',
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
        categoryId: 'c001',
        description: null,
        alt: 'Missing',
        sortOrder: 0,
        status: 'draft',
      }),
    ).rejects.toThrow('Artwork not found');
  });
});

describe('category storage', () => {
  it('resolves immutable category ids only', async () => {
    expect((await resolveCategoryInput('c002'))?.id).toBe('c002');
    expect(await resolveCategoryInput('Fine Art Collage')).toBeUndefined();
  });

  it('resolves category URL slugs separately from bulk upload ids', async () => {
    const category = await getCategoryBySlug('fine-art-collage');

    expect(category).toMatchObject({
      id: 'c002',
      categorySlug: 'fine-art-collage',
      label: 'Fine Art Collage',
    });
  });

  it('rejects duplicate category slugs and labels', async () => {
    await addCategory({ label: 'Test Category' });

    await expect(addCategory({ label: 'Test-Category' })).rejects.toThrow(
      'Category slug already exists',
    );
    await expect(addCategory({ label: 'test category' })).rejects.toThrow(
      'Category label already exists',
    );
  });

  it('lists active categories in sort order', async () => {
    await addCategory({ label: 'Zeta Category', sortOrder: 70 });
    await addCategory({ label: 'Alpha Category', sortOrder: 65 });

    expect((await listCategories()).map((category) => category.id).slice(-2)).toEqual([
      'c005',
      'c004',
    ]);
  });
});

describe('category updates', () => {
  it('updates editable fields without changing the id', async () => {
    const created = await addCategory({ label: 'Edit Me', description: 'Old', sortOrder: 100 });

    // Pin the created record's timestamps in the past so the update is detectable even
    // if it runs within the same millisecond as the create.
    const pastTimestamp = '2020-01-01T00:00:00.000Z';
    await sql`update artwork_categories set created_at = ${pastTimestamp}, updated_at = ${pastTimestamp} where id = ${created.id}`.execute(
      getKysely(),
    );

    const updated = await updateCategory({
      id: created.id,
      label: 'Edited Label',
      description: 'New',
      sortOrder: 200,
      status: 'archived',
    });

    expect(updated).toMatchObject({
      id: created.id,
      categorySlug: 'edited-label',
      label: 'Edited Label',
      description: 'New',
      sortOrder: 200,
      status: 'archived',
    });
    expect(updated.updatedAt).not.toBe(pastTimestamp);
  });

  it('rejects duplicate labels excluding the category being edited', async () => {
    await addCategory({ label: 'Existing Label' });
    const created = await addCategory({ label: 'Mine' });

    await expect(
      updateCategory({ id: created.id, label: 'Existing Label', status: 'active' }),
    ).rejects.toThrow('Category label already exists');
  });

  it('reports missing category ids', async () => {
    await expect(updateCategory({ id: 'missing', label: 'X', status: 'active' })).rejects.toThrow(
      'Category not found',
    );
  });
});

describe('category deletion', () => {
  it('deletes an unused category', async () => {
    const created = await addCategory({ label: 'Delete Me' });
    const deleted = await deleteCategoryById(created.id);

    expect(deleted.id).toBe(created.id);
    expect(await getCategoryById(created.id)).toBeUndefined();
  });

  it('rejects deleting a category used by artworks', async () => {
    await insertArtwork(createTestArtwork({ categoryId: 'c002' }));

    await expect(deleteCategoryById('c002')).rejects.toThrow('Cannot delete');
  });

  it('reports missing category ids', async () => {
    await expect(deleteCategoryById('missing')).rejects.toThrow('Category not found');
  });
});

describe('csv and slug helpers', () => {
  it('normalizes category ids from csv row values', async () => {
    const rows = parseCsvRows(
      `filename,title,category_id\nfirst.jpg,First,c002\nsecond.jpg,Second,Fine Art Collage`,
    );
    const resolved = await Promise.all(
      rows.map((row) => resolveCategoryInput(String(row.category_id))),
    );
    expect(resolved.map((category) => category?.id)).toEqual(['c002', undefined]);
  });

  it('reports missing files and duplicate filenames before upload', async () => {
    const rows = [
      {
        row: 2,
        filename: 'blue-bird.jpg',
        title: 'Blue Bird',
        categoryId: 'c001',
        alt: 'Blue bird illustration',
        description: 'A blue bird illustration.',
        sortOrder: 0,
        status: 'draft',
      },
      {
        row: 3,
        filename: 'blue-bird.jpg',
        title: 'Blue Bird 2',
        categoryId: 'c001',
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
      categoryId: 'c001',
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
        categoryId: 'c001',
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
        categoryId: 'c001',
        alt: null,
        description: null,
        sortOrder: 0,
        status: 'draft',
      }),
    ).rejects.toThrow('Only JPEG, PNG, or WebP images can be linked');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
