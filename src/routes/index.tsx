import { createFileRoute } from '@tanstack/react-router';

import { Header } from '@/components/Header';
import { Portfolio } from '@/components/Portfolio';

export const Route = createFileRoute('/')({ component: Home });

function Home() {
  return (
    <div>
      <Header />

      <Portfolio />
    </div>
  );
}
