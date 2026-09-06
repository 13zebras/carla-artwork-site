import { createFileRoute } from '@tanstack/react-router';

import { AnimationLayer } from '@/components/AnimationLayer';
import { Header } from '@/components/Header';
import { Portfolio } from '@/components/Portfolio';
import { listHomeArtworks } from '@/lib/functions/artworks.functions';
import { getAnimationSettings } from '@/lib/functions/site-settings.functions';

export const Route = createFileRoute('/')({
  loader: async () => {
    const [artworks, { animationGrayscale, animationType }] = await Promise.all([
      listHomeArtworks(),
      getAnimationSettings(),
    ]);
    return { artworks, animationGrayscale, animationType };
  },
  component: Home,
});

function Home() {
  const { artworks, animationGrayscale, animationType } = Route.useLoaderData();

  return (
    <div className='relative'>
      <Header />
      <AnimationLayer animationType={animationType} grayscale={animationGrayscale} />
      <Portfolio artworks={artworks} />
    </div>
  );
}
