import { createServerFn } from '@tanstack/react-start';

import { parseInteger } from '../shared/utils';

export const createAdminCategory = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    return data;
  })
  .handler(async ({ data }) => {
    const [{ requireAdminFromRequest }, { addCategory }, { ensureSchema }] = await Promise.all([
      import('../server/auth-session.server'),
      import('../server/categories.server'),
      import('../server/db.server'),
    ]);

    await ensureSchema();
    await requireAdminFromRequest();

    const label = data.get('label')?.toString() ?? '';
    const description = data.get('description')?.toString() ?? undefined;
    const sortOrder = parseInteger(data.get('sort_order'), {
      errorMessage: 'Category sort order must be an integer',
    });

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
    const [{ requireAdminFromRequest }, { updateCategory }, { ensureSchema }] = await Promise.all([
      import('../server/auth-session.server'),
      import('../server/categories.server'),
      import('../server/db.server'),
    ]);

    await ensureSchema();
    await requireAdminFromRequest();

    const id = data.get('id')?.toString().trim() ?? '';
    if (id.length === 0) {
      throw new Error('Category id is required');
    }

    const label = data.get('label')?.toString() ?? '';
    const description = data.get('description')?.toString().trim() || undefined;
    const sortOrder = parseInteger(data.get('sort_order'), {
      errorMessage: 'Category sort order must be an integer',
    });
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
    const [{ requireAdminFromRequest }, { deleteCategoryById }, { ensureSchema }] =
      await Promise.all([
        import('../server/auth-session.server'),
        import('../server/categories.server'),
        import('../server/db.server'),
      ]);

    await ensureSchema();
    await requireAdminFromRequest();
    return deleteCategoryById(data.id);
  });
