import { createFileRoute } from '@tanstack/react-router';

import { BeeAnimation } from '@/components/BeeAnimation';
import { Header } from '@/components/Header';
import { Portfolio } from '@/components/Portfolio';
import { listHomeArtworks } from '@/lib/functions/artworks.functions';

export const Route = createFileRoute('/')({
  loader: async () => {
    const artworks = await listHomeArtworks();
    return { artworks };
  },
  component: Home,
});

function Home() {
  const { artworks } = Route.useLoaderData();

  return (
    <div className='relative isolate'>
      <Header />
      <BeeAnimation />
      <Portfolio artworks={artworks} />
    </div>
  );
}
