import { createServerFn } from '@tanstack/react-start';

import { parseBeeSettings } from '@/lib/shared/bee-settings';

export const getPublishedBeeSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const [{ setResponseHeader }, { ensureSchema }, { getBeeSettings }] = await Promise.all([
    import('@tanstack/react-start/server'),
    import('@/lib/server/db.server'),
    import('@/lib/server/site-settings.server'),
  ]);
  setResponseHeader('Cache-Control', 'no-store');
  await ensureSchema();
  return getBeeSettings();
});

export const saveBeeSettings = createServerFn({ method: 'POST' })
  .validator(parseBeeSettings)
  .handler(async ({ data }) => {
    const { saveBeeSettingsFromRequest } = await import('@/lib/server/site-settings.server');
    return saveBeeSettingsFromRequest(data);
  });
