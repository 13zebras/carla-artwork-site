import type { ArtworkPageArtwork } from '@/lib/shared/artworks.types';
import { buildImageSrcSet, buildImageUrl, imageVariantWidths } from '@/lib/shared/image';
import { getParagraphs } from '@/lib/shared/utils';

const maximumPageWidth = 1000;
const artworkImageWidths = imageVariantWidths.filter(
  (width) => width >= 350 && width <= maximumPageWidth,
);

type ArtworkPageProps = {
  artwork: ArtworkPageArtwork;
};

export function ArtworkPage({ artwork }: ArtworkPageProps) {
  const descriptionParagraphs = artwork.description ? getParagraphs(artwork.description) : [];

  const maxFigureWidth = artwork.width > maximumPageWidth ? maximumPageWidth : artwork.width;
  const imageUrl = buildImageUrl(artwork.cdnUrl, maxFigureWidth, artwork.width);
  const imageSrcSet = buildImageSrcSet(artwork.cdnUrl, artwork.width, artworkImageWidths);
  const imageSizes = `(max-width: ${maxFigureWidth}px) 100vw, ${maxFigureWidth}px`;

  return (
    <main
      aria-label={`${artwork.title} artwork`}
      className='mx-auto px-6 xxs:px-8 sm:px-12 pt-48 xxs:pt-46 xs:pt-44 sm:pt-46 xl:pt-44 pb-12 max-w-7xl'
    >
      <h1 className='md:pt-2 xl:pt-6 pb-6 sm:pb-8 font-hand-rendered font-semibold text-3xl/10 min-[700px]:text-4xl/12 min-[950px]:text-5xl/15 text-center'>
        {artwork.title}
      </h1>
      {descriptionParagraphs.length > 0 ? (
        <div className='space-y-5 mx-auto px-2 pb-8 sm:pb-12 max-w-190 text-muted-foreground text-base sm:text-lg'>
          {descriptionParagraphs.map((paragraph) => (
            <p key={paragraph.id} className='whitespace-pre-line'>
              {paragraph.text}
            </p>
          ))}
        </div>
      ) : null}
      <figure
        className='shadow-card mx-auto w-full'
        style={{ aspectRatio: `${artwork.width} / ${artwork.height}`, maxWidth: maxFigureWidth }}
      >
        <img
          src={imageUrl}
          srcSet={imageSrcSet}
          sizes={imageSizes}
          alt={artwork.alt}
          width={artwork.width}
          height={artwork.height}
          loading='eager'
          decoding='sync'
          fetchPriority='high'
          className='block w-full h-auto'
        />
      </figure>
    </main>
  );
}
