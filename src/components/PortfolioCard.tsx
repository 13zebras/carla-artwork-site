import type { PortfolioArtwork } from '@/lib/shared/artworks.types';
import { buildBunnyCdnUrl } from '@/lib/shared/bunny';

type PortfolioCardProps = {
  artwork: PortfolioArtwork;
  priority?: boolean;
};

const fallbackImageWidth = 575;
const mobileMaximumImageWidth = 896;
const maximumImageWidth = 1150;
const responsiveImageWidths = [350, 448, 575, 700, 746, mobileMaximumImageWidth, maximumImageWidth];
const portfolioImageSizes = [
  '(max-width: 459px) calc(100vw - 48px)',
  '(max-width: 639px) calc(100vw - 64px)',
  '(max-width: 1023px) calc((100vw - 128px) / 2)',
  '(max-width: 1279px) calc((100vw - 160px) / 3)',
  '373px',
].join(', ');

function getCandidateWidths(sourceWidth: number, maximumWidth: number) {
  const largestWidth = Math.min(sourceWidth, maximumWidth);
  const widths = responsiveImageWidths.filter((width) => width < largestWidth);

  return [...widths, largestWidth];
}

function buildImageSrcSet(cdnUrl: string, sourceWidth: number, maximumWidth: number) {
  return getCandidateWidths(sourceWidth, maximumWidth)
    .map((width) => {
      const url = buildBunnyCdnUrl(cdnUrl, { width, format: 'webp' });
      return `${url} ${width}w`;
    })
    .join(', ');
}

export function PortfolioCard({ artwork, priority = false }: PortfolioCardProps) {
  const imageUrl = buildBunnyCdnUrl(artwork.cdnUrl, {
    width: Math.min(artwork.width, fallbackImageWidth),
    format: 'webp',
  });
  const imageSrcSet = buildImageSrcSet(artwork.cdnUrl, artwork.width, maximumImageWidth);
  const mobileImageSrcSet = buildImageSrcSet(
    artwork.cdnUrl,
    artwork.width,
    mobileMaximumImageWidth,
  );
  return (
    <article className='shadow-card mb-8 break-inside-avoid'>
      <a
        href={`/artwork/${artwork.slug}`}
        aria-label={`View details for ${artwork.title}`}
        className='group block relative bg-accent outline-none overflow-hidden text-accent-foreground'
      >
        <div
          className='relative w-full'
          style={{ aspectRatio: `${artwork.width} / ${artwork.height}` }}
        >
          <picture className='block w-full h-full'>
            <source
              media='(max-width: 639px)'
              srcSet={mobileImageSrcSet}
              sizes={portfolioImageSizes}
              type='image/webp'
            />
            <img
              src={imageUrl}
              srcSet={imageSrcSet}
              sizes={portfolioImageSizes}
              alt={artwork.alt}
              width={artwork.width}
              height={artwork.height}
              loading={priority ? 'eager' : 'lazy'}
              decoding={priority ? 'sync' : 'async'}
              fetchPriority={priority ? 'high' : 'auto'}
              className='w-full h-full object-cover group-focus-visible:scale-[1.02] group-hover:scale-[1.02] transition duration-300'
            />
          </picture>
        </div>
        <div className='absolute inset-0 flex flex-col justify-center items-center gap-4 bg-background/80 opacity-0 group-focus-visible:opacity-100 group-hover:opacity-100 p-4 transition-opacity duration-300'>
          <h3 className='font-semibold text-foreground text-2xl'>{artwork.title}</h3>
          <p className='text-muted-foreground text-xl'>{artwork.category.label}</p>
        </div>
      </a>
    </article>
  );
}
