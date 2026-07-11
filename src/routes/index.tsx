import { createFileRoute } from '@tanstack/react-router';

import { Header } from '@/components/Header';
import { Portfolio } from '@/components/Portfolio';
import { listHomeArtworks } from '@/lib/artworks.functions';

export const Route = createFileRoute('/')({
  loader: () => listHomeArtworks(),
  component: Home,
});

function Home() {
  const artworks = Route.useLoaderData();

  console.log('%c>>> artworks in index', 'color: red', artworks);

  return (
    <div className='relative'>
      <Header />

      <Portfolio artworks={artworks} />
    </div>
  );
}
