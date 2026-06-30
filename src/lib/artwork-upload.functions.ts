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
