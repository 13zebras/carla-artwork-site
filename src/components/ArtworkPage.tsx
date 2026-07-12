import { useWindowSize } from 'usehooks-ts';

import type { ArtworkPageArtwork } from '@/lib/shared/artworks.types';
import { buildBunnyCdnUrl } from '@/lib/shared/bunny';
import { getParagraphs } from '@/lib/shared/utils';

const mobileBreakpoint = 640;
const maximumPageWidth = 1000;
const mobileImageBuffer = 1.1;

type ArtworkPageProps = {
  artwork: ArtworkPageArtwork;
};

function getArtworkImageUrl(
  artwork: ArtworkPageArtwork,
  windowWidth: number | undefined,
): string | undefined {
  if (windowWidth === undefined) {
    return undefined;
  }

  const bufferedWidth =
    windowWidth < mobileBreakpoint ? windowWidth * mobileImageBuffer : windowWidth;
  const requestedWidth = Math.min(artwork.width, maximumPageWidth, Math.ceil(bufferedWidth));

  return buildBunnyCdnUrl(artwork.cdnUrl, { width: requestedWidth });
}

export function ArtworkPage({ artwork }: ArtworkPageProps) {
  const { width: windowWidth } = useWindowSize({ initializeWithValue: false });
  const imageUrl = getArtworkImageUrl(artwork, windowWidth);
  const descriptionParagraphs = artwork.description ? getParagraphs(artwork.description) : [];

  const maxFigureWidth = artwork.width > maximumPageWidth ? maximumPageWidth : artwork.width;

  return (
    <main
      aria-label={`${artwork.title} artwork`}
      className='mx-auto px-6 xxs:px-8 sm:px-12 pt-50 sm:pt-52 xl:pt-44 pb-12 max-w-7xl'
    >
      <h1 className='md:pt-2 xl:pt-6 pb-6 sm:pb-10 font-hand-rendered font-semibold text-3xl/10 min-[700px]:text-4xl/12 min-[950px]:text-5xl/15 text-center'>
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
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={artwork.alt}
            width={artwork.width}
            height={artwork.height}
            loading='eager'
            decoding='sync'
            fetchPriority='high'
            className='block w-full h-auto'
          />
        ) : null}
      </figure>
    </main>
  );
}
