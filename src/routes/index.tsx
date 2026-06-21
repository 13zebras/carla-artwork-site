import { createFileRoute } from '@tanstack/react-router';

import { Header } from '@/components/Header';
import { Portfolio } from '@/components/Portfolio';
import { artworks } from '@/data/artworks';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <div className='relative'>
      <Header />

      <Portfolio artworks={artworks} />
    </div>
  );
}
