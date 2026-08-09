import { createFileRoute } from '@tanstack/react-router';

import { AnimationLayer } from '@/components/AnimationLayer';
import { Header } from '@/components/Header';
import { Portfolio } from '@/components/Portfolio';
import { listHomeArtworks } from '@/lib/functions/artworks.functions';
import { getAnimationGrayscale } from '@/lib/functions/site-settings.functions';

export const Route = createFileRoute('/')({
  loader: async () => {
    const [artworks, { animationGrayscale }] = await Promise.all([
      listHomeArtworks(),
      getAnimationGrayscale(),
    ]);
    return { artworks, animationGrayscale };
  },
  component: Home,
});

function Home() {
  const { artworks, animationGrayscale } = Route.useLoaderData();

  return (
    <div className='relative'>
      <Header />
      <AnimationLayer grayscale={animationGrayscale} />
      <Portfolio artworks={artworks} />
    </div>
  );
}
