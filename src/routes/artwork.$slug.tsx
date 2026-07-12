import { createFileRoute, notFound } from '@tanstack/react-router';

import { ArtworkPage } from '@/components/ArtworkPage';
import { Header } from '@/components/Header';
import { getArtworkPage } from '@/lib/functions/artworks.functions';

export const Route = createFileRoute('/artwork/$slug')({
  loader: async ({ params }) => {
    const artwork = await getArtworkPage({ data: { artworkSlug: params.slug } });

    if (!artwork) {
      throw notFound();
    }

    return artwork;
  },
  component: ArtworkComponent,
});

function ArtworkComponent() {
  const artwork = Route.useLoaderData();

  return (
    <div className='relative'>
      <Header />
      <ArtworkPage artwork={artwork} />
    </div>
  );
}
