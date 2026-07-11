import { createServerFn } from '@tanstack/react-start';

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
