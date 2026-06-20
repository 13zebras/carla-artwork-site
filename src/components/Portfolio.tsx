import { PortfolioCard } from '@/components/PortfolioCard';
import { artworks } from '@/data/artworks';

const eagerImageCount = 12;

export function Portfolio() {
  return (
    <section
      aria-label='Artwork portfolio'
      className='mx-auto pt-48 sm:pt-52 lg:pt-38 max-w-7xl px-6 xxs:px-8 sm:px-12 pb-12'
    >
      <div className='columns-1 gap-8 sm:columns-2 lg:columns-3'>
        {artworks.map((artwork, index) => (
          <PortfolioCard key={artwork.slug} artwork={artwork} priority={index < eagerImageCount} />
        ))}
      </div>
    </section>
  );
}
