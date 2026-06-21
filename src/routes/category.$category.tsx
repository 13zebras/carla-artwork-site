import { createFileRoute, notFound } from '@tanstack/react-router';

import { Header } from '@/components/Header';
import { Portfolio } from '@/components/Portfolio';
import {
  ARTWORK_CATEGORIES,
  getArtworkCategoryBySlug,
  artworkCategoryDescriptions,
} from '@/data/artworkCategories';
import { getArtworksByCategory } from '@/data/artworks';

export const Route = createFileRoute('/category/$category')({
  loader: ({ params }) => {
    const category = getArtworkCategoryBySlug(params.category);

    if (!category) {
      throw notFound();
    }

    return {
      artworks: getArtworksByCategory(category),
      title: ARTWORK_CATEGORIES[category],
      description: artworkCategoryDescriptions[category],
    };
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
