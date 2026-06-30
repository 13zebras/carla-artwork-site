import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
// import { Separator } from '@/components/ui/separator';
import { authClient } from '@/lib/auth-client';
import { getSession, requireAdmin } from '@/lib/auth.functions';

export const Route = createFileRoute('/admin')({
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }

    try {
      await requireAdmin();
    } catch {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();

  return (
    <main className='min-h-screen bg-secondary-background'>
      <header className='fixed z-10 bg-accent-2/80 w-full px-12 pt-6 pb-4'>
        <div className='max-w-384 mx-auto flex flex-col items-center lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-12 xl:gap-16'>
          <div className='flex items-center gap-8 xl:gap-16'>
            <h1 className='text-3xl xl:text-3xl font-semibold'>Artwork Admin</h1>
            {/* <p className='text-base xl:text-lg'>carlastine.com</p> */}
          </div>
          <nav className='flex flex-wrap items-center gap-2 xl:gap-4'>
            <Button
              asChild
              variant='ghost'
              className='hidden lg:block text-base hover:text-brand-500'
            >
              <Link to='/admin'>Dashboard</Link>
            </Button>
            <Button
              asChild
              variant='ghost'
              className='hidden lg:block text-base hover:text-brand-500'
            >
              <Link to='/admin/upload'>Single Upload</Link>
            </Button>
            <Button
              asChild
              variant='ghost'
              className='hidden lg:block text-base hover:text-brand-500'
            >
              <Link to='/admin/bulk'>Bulk Upload</Link>
            </Button>
            <Button asChild variant='ghost' className='text-base group hover:text-brand-500'>
              <Link to='/' target='_blank'>
                Site{' '}
                <ExternalLink className='size-4 text-accent-foreground group-hover:text-brand-500' />
              </Link>
            </Button>
            <Button
              className='ml-2 border-brand-500 text-base hover:bg-brand-200 dark:hover:bg-brand-800 cursor-pointer bg-transparent'
              variant='outline'
              onClick={async () => {
                await authClient.signOut();
                navigate({ to: '/login', search: { redirect: '/admin' } });
              }}
            >
              Sign out
            </Button>
            <ThemeToggle className='ml-2' />
          </nav>
        </div>
      </header>

      <div className='hidden lg:block mx-auto w-full max-w-384 px-12 pt-32 lg:pt-20 pb-6'>
        <Outlet />
      </div>
      <div className='flex justify-center items-center lg:hidden mx-auto w-full px-12 pt-64 lg:pt-20 pb-6'>
        <h2 className='text-3xl font-semibold text-center'>Best viewed on larger screen</h2>
      </div>
    </main>
  );
}
