import { createFileRoute, notFound } from '@tanstack/react-router';

import { AnimationLayer } from '@/components/AnimationLayer';
import { Header } from '@/components/Header';
import { Portfolio } from '@/components/Portfolio';
import { getCategoryPage } from '@/lib/functions/artworks.functions';
import { getAnimationSettings } from '@/lib/functions/site-settings.functions';

export const Route = createFileRoute('/category/$category')({
  loader: async ({ params }) => {
    const [categoryPage, { animationGrayscale, animationType }] = await Promise.all([
      getCategoryPage({
        data: { categorySlug: params.category },
      }),
      getAnimationSettings(),
    ]);

    if (!categoryPage) {
      throw notFound();
    }

    return { ...categoryPage, animationGrayscale, animationType };
  },
  component: CategoryComponent,
});

function CategoryComponent() {
  const { artworks, title, description, animationGrayscale, animationType } = Route.useLoaderData();

  return (
    <div className='relative'>
      <Header />
      <AnimationLayer animationType={animationType} grayscale={animationGrayscale} />
      <Portfolio artworks={artworks} title={title} description={description} />
    </div>
  );
}
