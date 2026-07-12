import { createServerFn } from '@tanstack/react-start';

import type { ArtworkMetadataUpdate, ExistingArtworkInput } from '../shared/artworks.types';
import { normalizeArtworkStatus, parseInteger } from '../shared/utils';

export type {
  AdminDashboard,
  AdminDashboardData,
  BulkArtworkUploadError,
  BulkArtworkUploadFailure,
  BulkArtworkUploadResult,
  BulkArtworkUploadSuccess,
} from '../shared/artwork-upload.types';

function getInputObject(data: unknown) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request');
  }
  return data as Record<string, unknown>;
}

function getString(input: Record<string, unknown>, key: string) {
  return typeof input[key] === 'string' ? input[key].trim() : '';
}

function parseExistingArtworkInput(data: unknown): ExistingArtworkInput {
  const input = getInputObject(data);
  const storagePath = getString(input, 'storagePath');
  const title = getString(input, 'title');
  const categoryId = getString(input, 'categoryId');

  if (!storagePath) {
    throw new Error('Storage path is required');
  }
  if (!title) {
    throw new Error('Title is required');
  }
  if (!categoryId) {
    throw new Error('Category is required');
  }

  return {
    storagePath,
    title,
    categoryId,
    alt: getString(input, 'alt') || null,
    description: getString(input, 'description') || null,
    sortOrder: parseInteger(input.sortOrder, {
      fallback: 0,
      errorMessage: 'Artwork sort order must be an integer',
    }),
    status: normalizeArtworkStatus(input.status),
  };
}

function parseArtworkUpdate(data: unknown): ArtworkMetadataUpdate {
  const input = getInputObject(data);
  const id = getString(input, 'id');
  const title = getString(input, 'title');
  const categoryId = getString(input, 'categoryId');

  if (!id) {
    throw new Error('Artwork id is required');
  }
  if (!title) {
    throw new Error('Title is required');
  }
  if (!categoryId) {
    throw new Error('Category is required');
  }

  return {
    id,
    title,
    categoryId,
    alt: getString(input, 'alt') || title,
    description: getString(input, 'description') || null,
    sortOrder: parseInteger(input.sortOrder, {
      fallback: 0,
      errorMessage: 'Artwork sort order must be an integer',
    }),
    status: normalizeArtworkStatus(input.status),
  };
}

function validateFormData(data: unknown) {
  if (!(data instanceof FormData)) {
    throw new Error('Expected FormData');
  }
  return data;
}

export const listAdminDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const { listAdminDashboard: loadAdminDashboard } =
    await import('../server/artwork-upload.server');
  return loadAdminDashboard();
});

export const deleteArtwork = createServerFn({ method: 'POST' })
  .validator((data) => {
    const id = getString(getInputObject(data), 'id');
    if (!id) {
      throw new Error('Artwork id is required');
    }
    return { id };
  })
  .handler(async ({ data }) => {
    const { deleteArtwork: runDeleteArtwork } = await import('../server/artwork-upload.server');
    return runDeleteArtwork(data.id);
  });

export const uploadSingleArtwork = createServerFn({ method: 'POST' })
  .validator(validateFormData)
  .handler(async ({ data }) => {
    const { uploadSingleArtwork: runUploadSingleArtwork } =
      await import('../server/artwork-upload.server');
    return runUploadSingleArtwork(data);
  });

export const uploadBulkArtworks = createServerFn({ method: 'POST' })
  .validator(validateFormData)
  .handler(async ({ data }) => {
    const { uploadBulkArtworks: runUploadBulkArtworks } =
      await import('../server/artwork-upload.server');
    return runUploadBulkArtworks(data);
  });

export const registerExistingArtwork = createServerFn({ method: 'POST' })
  .validator(parseExistingArtworkInput)
  .handler(async ({ data }) => {
    const { registerExistingArtwork: runRegisterExistingArtwork } =
      await import('../server/artwork-upload.server');
    return runRegisterExistingArtwork(data);
  });

export const updateArtwork = createServerFn({ method: 'POST' })
  .validator(parseArtworkUpdate)
  .handler(async ({ data }) => {
    const { updateArtwork: runUpdateArtwork } = await import('../server/artwork-upload.server');
    return runUpdateArtwork(data);
  });
