import { createFileRoute, notFound } from '@tanstack/react-router';

import { Header } from '@/components/Header';
import { Portfolio } from '@/components/Portfolio';
import { SiteBeeAnimation } from '@/components/SiteBeeAnimation';
import { getCategoryPage } from '@/lib/functions/artworks.functions';
import { getPublishedBeeSettings } from '@/lib/functions/bee-settings.functions';

export const Route = createFileRoute('/category/$category')({
  loader: async ({ params }) => {
    const [categoryPage, bee] = await Promise.all([
      getCategoryPage({ data: { categorySlug: params.category } }),
      getPublishedBeeSettings(),
    ]);

    if (!categoryPage) {
      throw notFound();
    }

    return { ...categoryPage, bee };
  },
  component: CategoryComponent,
});

function CategoryComponent() {
  const { artworks, title, description, bee } = Route.useLoaderData();

  return (
    <div className='relative'>
      <Header />
      <SiteBeeAnimation initial={bee} />
      <Portfolio artworks={artworks} title={title} description={description} />
    </div>
  );
}
