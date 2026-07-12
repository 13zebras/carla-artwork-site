import { createFileRoute } from '@tanstack/react-router';

import { Header } from '@/components/Header';

export const Route = createFileRoute('/coming-soon')({
  component: ComingSoonComponent,
});

function ComingSoonComponent() {
  return (
    <div className='relative bg-background min-h-screen text-foreground'>
      <Header />
      <main className='px-8 xs:px-10 sm:px-12 pt-56 xl:pt-44 pb-16'>
        <div className='flex flex-col items-center gap-8 sm:gap-16 mx-auto sm:pt-4 w-full max-w-4xl font-hand-rendered'>
          <h1 className='text-[2.1rem] sm:text-5xl'>
            Coming<span className='ml-3'>Soon!</span>
          </h1>
          <p className='text-xl sm:text-2xl'>Stay tuned for more</p>
        </div>
      </main>
    </div>
  );
}
