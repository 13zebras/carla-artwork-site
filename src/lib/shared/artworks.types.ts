export type ArtworkCategorySummary = {
  id: string;
  label: string;
};

export type ArtworkStatus = 'draft' | 'published';

export type ArtworkRecord = {
  id: string;
  slug: string;
  title: string;
  categoryId: string;
  category: ArtworkCategorySummary;
  description: string | null;
  alt: string;
  originalFilename: string;
  storagePath: string;
  cdnUrl: string;
  contentType: string;
  width: number;
  height: number;
  sizeBytes: number;
  checksumSha256: string;
  sortOrder: number;
  status: ArtworkStatus;
  createdAt: string;
  updatedAt: string;
};

export type ArtworkMetadataUpdate = {
  id: string;
  title: string;
  categoryId: string;
  description: string | null;
  alt: string;
  sortOrder: number;
  status: ArtworkStatus;
};

export type ExistingArtworkInput = Omit<ArtworkMetadataUpdate, 'id' | 'alt'> & {
  storagePath: string;
  alt: string | null;
};

export type PortfolioArtworkCategory = {
  id: string;
  categorySlug: string;
  label: string;
};

export type PortfolioArtwork = {
  slug: string;
  title: string;
  category: PortfolioArtworkCategory;
  cdnUrl: string;
  alt: string;
  width: number;
  height: number;
};

export type ArtworkPageArtwork = PortfolioArtwork & {
  description: string | null;
};
