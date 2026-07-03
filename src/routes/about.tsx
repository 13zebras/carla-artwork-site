import { createFileRoute } from '@tanstack/react-router';

import { Header } from '@/components/Header';

export const Route = createFileRoute('/about')({
  component: AboutComponent,
});

function AboutComponent() {
  return (
    <div className='relative'>
      <Header />
      <div className='flex flex-col items-center justify-center gap-12 h-[70vh]'>
        <h1 className='text-3xl font-bold'>About</h1>
        <p className='text-muted-foreground text-lg'>Give me time, I'll get 'round to it!.</p>
      </div>
    </div>
  );
}
