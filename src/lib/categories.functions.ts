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

function parseStatus(value: FormDataEntryValue | null): 'active' | 'archived' {
  const raw = value?.toString().trim();
  if (raw === 'active' || raw === 'archived') {
    return raw;
  }
  throw new Error('Category status must be active or archived');
}

export const updateAdminCategory = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    return data;
  })
  .handler(async ({ data }) => {
    await ensureSchema();
    const [{ requireAdminFromRequest }, { updateCategory }] = await Promise.all([
      import('./auth.server'),
      import('./categories.server'),
    ]);

    await requireAdminFromRequest();

    const id = data.get('id')?.toString().trim() ?? '';
    if (id.length === 0) {
      throw new Error('Category id is required');
    }

    const label = data.get('label')?.toString() ?? '';
    const description = data.get('description')?.toString().trim() || undefined;
    const sortOrder = parseSortOrder(data.get('sort_order'));
    const status = parseStatus(data.get('status'));

    return updateCategory({ id, label, description, sortOrder, status });
  });

export const deleteAdminCategory = createServerFn({ method: 'POST' })
  .validator((data) => {
    const id =
      data && typeof data === 'object' && 'id' in data && typeof data.id === 'string'
        ? data.id.trim()
        : '';
    if (id.length === 0) {
      throw new Error('Category id is required');
    }
    return { id };
  })
  .handler(async ({ data }) => {
    await ensureSchema();
    const [{ requireAdminFromRequest }, { deleteCategoryById }] = await Promise.all([
      import('./auth.server'),
      import('./categories.server'),
    ]);

    await requireAdminFromRequest();
    return deleteCategoryById(data.id);
  });
