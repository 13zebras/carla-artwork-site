import { ARTWORK_CATEGORIES, type ArtworkCategory } from '@/data/artworkCategories';

export type Artwork = {
  slug: string;
  title: string;
  category: ArtworkCategory;
  description?: string;
  imageSrc: string;
  alt: string;
  width: number;
  height: number;
};

//

export const artworks: Array<Artwork> = generateRandomArtworks(100);

export function getArtworksByCategory(category: ArtworkCategory) {
  return artworks.filter((artwork) => artwork.category === category);
}

function generateRandomArtworks(count: number): Array<Artwork> {
  const width = 512;
  const minHeight = 500;
  const maxHeight = 780;
  const categories = Object.keys(ARTWORK_CATEGORIES) as Array<ArtworkCategory>;
  const titleWords = [
    'Amber',
    'Quiet',
    'Garden',
    'Blue',
    'Wild',
    'Paper',
    'Bloom',
    'Midnight',
    'Golden',
    'River',
    'Field',
    'Studio',
    'Soft',
    'Bright',
    'Forest',
    'Dream',
    'Shadow',
    'Meadow',
    'Silver',
    'Moss',
    'Dawn',
    'Velvet',
    'Fern',
    'Moon',
    'Still',
    'Rose',
    'Mist',
    'Hollow',
  ];
  const randomItem = <T>(items: Array<T>) => items[Math.floor(Math.random() * items.length)];
  const randomHeight = () => Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
  const randomTitle = () => Array.from({ length: 3 }, () => randomItem(titleWords)).join(' ');
  const randomSlug = () => String(Math.floor(Math.random() * 1_000_000_000));

  return Array.from({ length: Math.max(0, Math.floor(count)) }, () => {
    const height = randomHeight();

    return {
      slug: randomSlug(),
      title: randomTitle(),
      category: randomItem(categories),
      imageSrc: `https://picsum.photos/${width}/${height}`,
      alt: 'Placeholder image',
      width,
      height,
    };
  });
}
