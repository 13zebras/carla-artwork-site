import { createFileRoute, notFound } from '@tanstack/react-router';

import { Header } from '@/components/Header';
import { Portfolio } from '@/components/Portfolio';
import { getCategoryPage } from '@/lib/functions/artworks.functions';

export const Route = createFileRoute('/category/$category')({
  loader: async ({ params }) => {
    const categoryPage = await getCategoryPage({
      data: { categorySlug: params.category },
    });

    if (!categoryPage) {
      throw notFound();
    }

    return categoryPage;
  },
  component: CategoryComponent,
});

function CategoryComponent() {
  const { artworks, title, description } = Route.useLoaderData();

  return (
    <div className='relative'>
      <Header />
      <Portfolio artworks={artworks} title={title} description={description} />
    </div>
  );
}
