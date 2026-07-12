import { createServerFn } from '@tanstack/react-start';

import type { ArtworkCategoryNavItem } from '../shared/categories.types';

export const listHomeArtworks = createServerFn({ method: 'GET' }).handler(async () => {
  const [{ ensureSchema }, { getSiteSettings }] = await Promise.all([
    import('../server/db.server'),
    import('../server/site-settings.server'),
  ]);

  await ensureSchema();
  const { demoMode } = await getSiteSettings();

  if (demoMode) {
    const { artworks } = await import('@/data/artworks');
    return artworks;
  }

  const { listPublishedArtworks } = await import('../server/artworks.server');
  return listPublishedArtworks();
});

export const listArtworkNavigationCategories = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ArtworkCategoryNavItem[]> => {
    const [{ ensureSchema }, { getSiteSettings }] = await Promise.all([
      import('../server/db.server'),
      import('../server/site-settings.server'),
    ]);

    await ensureSchema();
    const { demoMode } = await getSiteSettings();

    if (demoMode) {
      const { ARTWORK_CATEGORIES, ARTWORK_CATEGORY_SLUGS } =
        await import('@/data/artworkCategories');

      return Object.keys(ARTWORK_CATEGORIES).map((category) => {
        const key = category as keyof typeof ARTWORK_CATEGORIES;
        return {
          categorySlug: ARTWORK_CATEGORY_SLUGS[key],
          label: ARTWORK_CATEGORIES[key],
        };
      });
    }

    const { listCategories } = await import('../server/categories.server');
    const categories = await listCategories();
    return categories.map(({ categorySlug, label }) => ({ categorySlug, label }));
  },
);

export const getArtworkPage = createServerFn({ method: 'GET' })
  .validator((data: { artworkSlug: string }) => {
    if (!data || typeof data !== 'object' || typeof data.artworkSlug !== 'string') {
      throw new Error('Artwork slug is required');
    }

    return { artworkSlug: data.artworkSlug.trim().toLowerCase() };
  })
  .handler(async ({ data }) => {
    const [{ ensureSchema }, { getSiteSettings }] = await Promise.all([
      import('../server/db.server'),
      import('../server/site-settings.server'),
    ]);

    await ensureSchema();
    const { demoMode } = await getSiteSettings();

    if (demoMode) {
      const { artworks } = await import('@/data/artworks');
      const artwork = artworks.find(({ slug }) => slug === data.artworkSlug);
      return artwork ? { ...artwork, description: null } : null;
    }

    const { getPublishedArtworkBySlug } = await import('../server/artworks.server');
    return (await getPublishedArtworkBySlug(data.artworkSlug)) ?? null;
  });

export const getCategoryPage = createServerFn({ method: 'GET' })
  .validator((data: { categorySlug: string }) => {
    if (!data || typeof data !== 'object' || typeof data.categorySlug !== 'string') {
      throw new Error('Category slug is required');
    }

    return { categorySlug: data.categorySlug.trim().toLowerCase() };
  })
  .handler(async ({ data }) => {
    const [{ ensureSchema }, { getSiteSettings }] = await Promise.all([
      import('../server/db.server'),
      import('../server/site-settings.server'),
    ]);

    await ensureSchema();
    const { demoMode } = await getSiteSettings();

    if (demoMode) {
      const [
        { ARTWORK_CATEGORIES, getArtworkCategoryBySlug, artworkCategoryDescriptions },
        artwork,
      ] = await Promise.all([import('@/data/artworkCategories'), import('@/data/artworks')]);
      const category = getArtworkCategoryBySlug(data.categorySlug);

      if (!category) {
        return null;
      }

      return {
        artworks: artwork.getArtworksByCategory(category),
        title: ARTWORK_CATEGORIES[category],
        description: artworkCategoryDescriptions[category],
      };
    }

    const [{ getCategoryBySlug }, { listPublishedArtworksByCategoryId }] = await Promise.all([
      import('../server/categories.server'),
      import('../server/artworks.server'),
    ]);
    const category = await getCategoryBySlug(data.categorySlug);

    if (!category || category.status !== 'active') {
      return null;
    }

    return {
      artworks: await listPublishedArtworksByCategoryId(category.id),
      title: category.label,
      description: category.description ?? undefined,
    };
  });
