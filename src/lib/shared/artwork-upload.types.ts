import type { AboutContent } from './about.types';
import type { ArtworkRecord } from './artworks.types';
import type { BunnyStorageFile } from './bunny.types';
import type { ArtworkCategoryRecord } from './categories.types';

export type BulkArtworkUploadError = {
  row: number;
  filename: string | null;
  message: string;
};

export type AdminDashboardData = {
  dashboard: {
    records: ArtworkRecord[];
    storageFiles: BunnyStorageFile[];
    activeCategories: ArtworkCategoryRecord[];
  };
  archivedCategories: ArtworkCategoryRecord[];
  demoMode: boolean;
  about: AboutContent;
};

export type BulkArtworkUploadSuccess = {
  ok: true;
  insertedCount: number;
  records: ArtworkRecord[];
};

export type BulkArtworkUploadFailure = {
  ok: false;
  errors: BulkArtworkUploadError[];
};

export type BulkArtworkUploadResult = BulkArtworkUploadSuccess | BulkArtworkUploadFailure;

export type AdminDashboard = {
  records: ArtworkRecord[];
  storageFiles: BunnyStorageFile[];
  activeCategories: ArtworkCategoryRecord[];
};
