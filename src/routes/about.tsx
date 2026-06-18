import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutComponent,
});

function AboutComponent() {
  return (
    <div className='flex flex-col items-center justify-center gap-16 h-screen'>
      <h1 className='text-3xl font-bold'>About</h1>
      <p className='text-muted-foreground text-lg'>Give me time, I'll get 'round to it!.</p>
      <Link to='/' className='text-sky-600 hover:text-sky-500 transition-colors text-lg'>
        Go to home page
      </Link>
    </div>
  );
}
