import { PortfolioCard } from '@/components/PortfolioCard';
import type { PortfolioArtwork } from '@/lib/shared/artworks.types';
import { getParagraphs } from '@/lib/shared/utils';

const eagerImageCount = 12;

type PortfolioProps = {
  artworks: PortfolioArtwork[];
  title?: string;
  description?: string;
};
export function Portfolio({ artworks, title, description }: PortfolioProps) {
  const descriptionParagraphs = description ? getParagraphs(description) : [];

  return (
    <main
      aria-label='Artwork portfolio'
      className='mx-auto px-6 xxs:px-8 sm:px-12 pt-48 xxs:pt-46 xs:pt-44 sm:pt-46 xl:pt-44 pb-12 max-w-7xl'
    >
      {title ? (
        <h1 className='md:pt-2 xl:pt-6 pb-6 sm:pb-8 font-hand-rendered font-semibold text-3xl/10 min-[700px]:text-4xl/12 min-[950px]:text-5xl/15 text-center'>
          {title}
        </h1>
      ) : null}
      {descriptionParagraphs.length > 0 ? (
        <div className='space-y-5 mx-auto px-2 pb-8 sm:pb-12 max-w-190 text-muted-foreground text-base sm:text-lg'>
          {descriptionParagraphs.map((paragraph) => (
            <p key={paragraph.id} className='whitespace-pre-line'>
              {paragraph.text}
            </p>
          ))}
        </div>
      ) : null}
      <div className='gap-8 columns-1 sm:columns-2 lg:columns-3'>
        {artworks.map((artwork, index) => (
          <PortfolioCard key={artwork.slug} artwork={artwork} priority={index < eagerImageCount} />
        ))}
      </div>
    </main>
  );
}
