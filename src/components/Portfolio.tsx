import { PortfolioCard } from '@/components/PortfolioCard';
import type { PortfolioArtwork } from '@/lib/shared/artworks.types';

const eagerImageCount = 12;

type PortfolioProps = {
  artworks: PortfolioArtwork[];
  title?: string;
  description?: string;
};
export function Portfolio({ artworks, title, description }: PortfolioProps) {
  return (
    <main
      aria-label='Artwork portfolio'
      className='mx-auto px-6 xxs:px-8 sm:px-12 pt-50 sm:pt-52 xl:pt-44 pb-12 max-w-7xl'
    >
      {title ? (
        <h1 className='md:pt-2 xl:pt-6 pb-6 sm:pb-10 font-hand-rendered font-semibold text-3xl/10 min-[700px]:text-4xl/12 min-[950px]:text-5xl/15 text-center'>
          {title}
        </h1>
      ) : null}
      {description ? (
        <p className='mx-auto px-2 pb-8 sm:pb-12 max-w-190 text-muted-foreground text-base sm:text-lg'>
          {description}
        </p>
      ) : null}
      <div className='gap-8 columns-1 sm:columns-2 lg:columns-3'>
        {artworks.map((artwork, index) => (
          <PortfolioCard key={artwork.slug} artwork={artwork} priority={index < eagerImageCount} />
        ))}
      </div>
    </main>
  );
}
