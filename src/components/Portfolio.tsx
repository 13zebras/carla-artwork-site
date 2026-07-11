import { PortfolioCard } from '@/components/PortfolioCard';
import type { PortfolioArtwork } from '@/lib/artworks.types';

const eagerImageCount = 12;

type PortfolioProps = {
  artworks: PortfolioArtwork[];
  title?: string;
  description?: string;
};
export function Portfolio({ artworks, title, description }: PortfolioProps) {
  return (
    <section
      aria-label='Artwork portfolio'
      className='mx-auto pt-48 sm:pt-52 xl:pt-38 max-w-7xl px-6 xxs:px-8 sm:px-12 pb-12'
    >
      {title ? (
        <h1 className='md:pt-2 xl:pt-6 pb-6 sm:pb-10 font-hand-rendered text-2xl/10 sm:text-3xl/10 font-semibold text-center'>
          {title}
        </h1>
      ) : null}
      {description ? (
        <p className='pb-8 sm:pb-12 px-2 xs:px-8 sm:px-12 md:px-20 lg:px-32 text-base sm:text-lg text-muted-foreground'>
          {description}
        </p>
      ) : null}
      <div className='columns-1 gap-8 sm:columns-2 lg:columns-3'>
        {artworks.map((artwork, index) => (
          <PortfolioCard key={artwork.slug} artwork={artwork} priority={index < eagerImageCount} />
        ))}
      </div>
    </section>
  );
}
