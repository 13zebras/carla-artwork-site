import { createFileRoute } from '@tanstack/react-router';

import { Header } from '@/components/Header';
import { Portfolio } from '@/components/Portfolio';
import { SiteBeeAnimation } from '@/components/SiteBeeAnimation';
import { listHomeArtworks } from '@/lib/functions/artworks.functions';
import { getPublishedBeeSettings } from '@/lib/functions/bee-settings.functions';

export const Route = createFileRoute('/')({
  loader: async () => {
    const [artworks, bee] = await Promise.all([listHomeArtworks(), getPublishedBeeSettings()]);
    return { artworks, bee };
  },
  component: Home,
});

function Home() {
  const { artworks, bee } = Route.useLoaderData();

  return (
    <div className='relative isolate'>
      <Header />

      <SiteBeeAnimation initial={bee} />
      <Portfolio artworks={artworks} />
    </div>
  );
}
