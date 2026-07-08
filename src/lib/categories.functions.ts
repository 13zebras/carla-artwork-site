import { createServerFn } from '@tanstack/react-start';

import { ensureSchema } from './db.server';

function parseSortOrder(value: FormDataEntryValue | null) {
  if (value == null || value.toString().trim() === '') {
    return undefined;
  }

  const parsed = Number(value.toString());
  if (!Number.isInteger(parsed)) {
    throw new Error('Category sort order must be an integer');
  }

  return parsed;
}

export const listAdminCategories = createServerFn({ method: 'GET' }).handler(async () => {
  await ensureSchema();
  const [{ requireAdminFromRequest }, { listCategories }] = await Promise.all([
    import('./auth.server'),
    import('./categories.server'),
  ]);

  await requireAdminFromRequest();
  return listCategories({ includeArchived: true });
});

export const createAdminCategory = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    return data;
  })
  .handler(async ({ data }) => {
    await ensureSchema();
    const [{ requireAdminFromRequest }, { addCategory }] = await Promise.all([
      import('./auth.server'),
      import('./categories.server'),
    ]);

    await requireAdminFromRequest();

    const label = data.get('label')?.toString() ?? '';
    const description = data.get('description')?.toString() ?? undefined;
    const sortOrder = parseSortOrder(data.get('sort_order'));

    return addCategory({ label, description, sortOrder });
  });
