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
      import('./auth.server'),
      import('./db.server'),
      import('./site-settings.server'),
    ]);

    await ensureSchema();
    await requireAdminFromRequest();
    return updateDemoMode(data.demoMode);
  });
