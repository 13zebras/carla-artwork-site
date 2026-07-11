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
