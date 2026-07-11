import type { PortfolioArtwork } from '@/lib/artworks.types';

type PortfolioCardProps = {
  artwork: PortfolioArtwork;
  priority?: boolean;
};

export function PortfolioCard({ artwork, priority = false }: PortfolioCardProps) {
  return (
    <article className='mb-8 break-inside-avoid shadow-card'>
      <a
        href={`/artwork/${artwork.slug}`}
        aria-label={`View details for ${artwork.title}`}
        className='group relative block overflow-hidden bg-accent text-accent-foreground outline-none'
      >
        <div
          className='relative w-full'
          style={{ aspectRatio: `${artwork.width} / ${artwork.height}` }}
        >
          <img
            src={artwork.cdnUrl}
            alt={artwork.alt}
            width={artwork.width}
            height={artwork.height}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            fetchPriority={priority ? 'high' : 'auto'}
            className='h-full w-full object-cover transition duration-300 group-hover:scale-[1.02] group-focus-visible:scale-[1.02]'
          />
        </div>
        <div className='absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 p-4 transition-opacity duration-300 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'>
          <h3 className='text-2xl font-semibold text-foreground'>{artwork.title}</h3>
          <p className='text-xl text-muted-foreground'>{artwork.category.label}</p>
        </div>
      </a>
    </article>
  );
}
