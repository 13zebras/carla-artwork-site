import { createServerFn } from '@tanstack/react-start';

import type { ArtworkRecord } from './artworks.server';
import type { BunnyStorageFile } from './bunny.server';
import type { ArtworkCategoryRecord } from './categories.server';

export type {
  AdminDashboardData,
  BulkArtworkUploadError,
  BulkArtworkUploadFailure,
  BulkArtworkUploadResult,
  BulkArtworkUploadSuccess,
} from './artwork-upload.server';

export type AdminDashboard = {
  records: ArtworkRecord[];
  storageFiles: BunnyStorageFile[];
  categories: ArtworkCategoryRecord[];
};

export const listAdminDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const { listAdminDashboard: loadAdminDashboard } = await import('./artwork-upload.server');
  return loadAdminDashboard();
});

export const deleteArtwork = createServerFn({ method: 'POST' })
  .validator((data) => {
    const id =
      data && typeof data === 'object' && 'id' in data && typeof data.id === 'string'
        ? data.id.trim()
        : '';
    if (id.length === 0) {
      throw new Error('Artwork id is required');
    }
    return { id };
  })
  .handler(async ({ data }) => {
    const { deleteArtwork: runDeleteArtwork } = await import('./artwork-upload.server');
    return runDeleteArtwork({ data });
  });

export const uploadSingleArtwork = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { uploadSingleArtwork: runUploadSingleArtwork } = await import('./artwork-upload.server');
    return runUploadSingleArtwork({ data });
  });

export const uploadBulkArtworks = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { uploadBulkArtworks: runUploadBulkArtworks } = await import('./artwork-upload.server');
    return runUploadBulkArtworks({ data });
  });

export const registerExistingArtwork = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      storagePath: string;
      title: string;
      categoryId: string;
      alt?: string | null;
      description?: string | null;
      sortOrder?: number | string;
      status?: string;
    }) => {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid request');
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    const { registerExistingArtwork: runRegisterExistingArtwork } = await import(
      './artwork-upload.server'
    );
    return runRegisterExistingArtwork({ data });
  });

export const updateArtwork = createServerFn({ method: 'POST' })
  .validator(
    (data: {
      id: string;
      title: string;
      categoryId: string;
      alt?: string | null;
      description?: string | null;
      sortOrder?: number | string;
      status?: string;
    }) => {
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid request');
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    const { updateArtwork: runUpdateArtwork } = await import('./artwork-upload.server');
    return runUpdateArtwork({ data });
  });
