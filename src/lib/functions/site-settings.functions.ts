import { createServerFn } from '@tanstack/react-start';

export const setDemoMode = createServerFn({ method: 'POST' })
  .validator((data: { demoMode: boolean }) => {
    if (!data || typeof data !== 'object' || typeof data.demoMode !== 'boolean') {
      throw new Error('Demo mode must be true or false');
    }

    return { demoMode: data.demoMode };
  })
  .handler(async ({ data }) => {
    const [{ requireAdminFromRequest }, { ensureSchema }, { updateDemoMode }] = await Promise.all([
      import('../server/auth-session.server'),
      import('../server/db.server'),
      import('../server/site-settings.server'),
    ]);

    await ensureSchema();
    await requireAdminFromRequest();
    return updateDemoMode(data.demoMode);
  });

export const setAnimationGrayscale = createServerFn({ method: 'POST' })
  .validator((data: { animationGrayscale: boolean }) => {
    if (!data || typeof data !== 'object' || typeof data.animationGrayscale !== 'boolean') {
      throw new Error('Animation grayscale must be true or false');
    }

    return { animationGrayscale: data.animationGrayscale };
  })
  .handler(async ({ data }) => {
    const [{ requireAdminFromRequest }, { ensureSchema }, { updateAnimationGrayscale }] =
      await Promise.all([
        import('../server/auth-session.server'),
        import('../server/db.server'),
        import('../server/site-settings.server'),
      ]);

    await ensureSchema();
    await requireAdminFromRequest();
    return updateAnimationGrayscale(data.animationGrayscale);
  });

export const getAnimationGrayscale = createServerFn({ method: 'GET' }).handler(async () => {
  const [{ ensureSchema }, { getSiteSettings }] = await Promise.all([
    import('../server/db.server'),
    import('../server/site-settings.server'),
  ]);

  await ensureSchema();
  const { animationGrayscale } = await getSiteSettings();
  return { animationGrayscale };
});
