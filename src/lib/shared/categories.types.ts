export type ArtworkCategoryNavItem = {
  categorySlug: string;
  label: string;
};

export type ArtworkCategoryRecord = {
  id: string;
  categorySlug: string;
  label: string;
  description: string | null;
  sortOrder: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
};
