import { createServerFn } from '@tanstack/react-start';

export const listHomeArtworks = createServerFn({ method: 'GET' }).handler(async () => {
  const [{ ensureSchema }, { getSiteSettings }] = await Promise.all([
    import('./db.server'),
    import('./site-settings.server'),
  ]);

  await ensureSchema();
  const { demoMode } = await getSiteSettings();

  if (demoMode) {
    const { artworks } = await import('@/data/artworks');
    return artworks;
  }

  const { listPublishedArtworks } = await import('./artworks.server');
  return listPublishedArtworks();
});
