import { beforeEach, describe, expect, it } from 'vitest';

import { buildBulkErrors, getUniqueArtworkSlug, parseCsvRows } from '@/lib/artwork-upload.helpers';
import { buildBunnyCdnUrl } from '@/lib/bunny';
import { addCategory, listCategories, resolveCategoryInput } from '@/lib/categories.server';
import { getDb } from '@/lib/db.server';

const seededCategoryIds = [
  'illustration',
  'fineArtCollage',
  'graphicDesign',
  'food',
  'botanicalIllustration',
  'specialProjects',
];

function resetDatabase() {
  const db = getDb();
  db.exec(`
    delete from artworks;
    delete from artwork_categories where id not in (${seededCategoryIds.map((id) => `'${id}'`).join(', ')});
  `);
}

beforeEach(() => {
  resetDatabase();
});

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

describe('category storage', () => {
  it('resolves seeded category ids, slugs, and labels', () => {
    expect(resolveCategoryInput('fineArtCollage')?.id).toBe('fineArtCollage');
    expect(resolveCategoryInput('fine-art-collage')?.id).toBe('fineArtCollage');
    expect(resolveCategoryInput('Fine Art Collage')?.id).toBe('fineArtCollage');
  });

  it('rejects duplicate category slugs and labels', () => {
    addCategory({ label: 'Test Category', slug: 'test-category' });

    expect(() => addCategory({ label: 'Another Category', slug: 'test-category' })).toThrow(
      'Category slug already exists',
    );
    expect(() => addCategory({ label: 'test category', slug: 'different-category' })).toThrow(
      'Category label already exists',
    );
  });

  it('lists active categories in sort order', () => {
    addCategory({ label: 'Zeta Category', slug: 'zeta-category', sortOrder: 70 });
    addCategory({ label: 'Alpha Category', slug: 'alpha-category', sortOrder: 65 });

    expect(
      listCategories()
        .map((category) => category.slug)
        .slice(-2),
    ).toEqual(['alpha-category', 'zeta-category']);
  });
});

describe('csv and slug helpers', () => {
  it('normalizes category ids from csv row values', () => {
    const rows = parseCsvRows(
      `filename,title,category\nfirst.jpg,First,fineArtCollage\nsecond.jpg,Second,fine-art-collage\nthird.jpg,Third,Fine Art Collage`,
    );
    expect(rows.map((row) => resolveCategoryInput(String(row.category))?.id)).toEqual([
      'fineArtCollage',
      'fineArtCollage',
      'fineArtCollage',
    ]);
  });

  it('reports missing files and duplicate filenames before upload', () => {
    const rows = [
      {
        row: 2,
        filename: 'blue-bird.jpg',
        title: 'Blue Bird',
        category: 'illustration',
        alt: undefined,
        description: undefined,
        slug: undefined,
        sortOrder: undefined,
        status: undefined,
      },
      {
        row: 3,
        filename: 'blue-bird.jpg',
        title: 'Blue Bird 2',
        category: 'illustration',
        alt: undefined,
        description: undefined,
        slug: undefined,
        sortOrder: undefined,
        status: undefined,
      },
    ] satisfies Parameters<typeof buildBulkErrors>[0];

    const duplicateErrors = buildBulkErrors(rows, [
      new File(['x'], 'blue-bird.jpg', { type: 'image/jpeg' }),
    ]);
    expect(
      duplicateErrors.some((error) => error.message.includes('Duplicate filename blue-bird.jpg')),
    ).toBe(true);

    const missingErrors = buildBulkErrors(rows.slice(0, 1), []);
    expect(
      missingErrors.some((error) => error.message.includes('Missing uploaded file blue-bird.jpg')),
    ).toBe(true);
  });

  it('appends numeric suffixes to conflicting slugs', () => {
    expect(getUniqueArtworkSlug('blue-bird', new Set(['blue-bird']))).toBe('blue-bird-2');
    expect(getUniqueArtworkSlug('blue-bird', new Set(['blue-bird', 'blue-bird-2']))).toBe(
      'blue-bird-3',
    );
  });
});
