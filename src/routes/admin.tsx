import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';

import { BunnyStorageTab } from '@/components/admin/BunnyStorageTab';
import { CategoriesTab } from '@/components/admin/CategoriesTab';
import { DashboardSummary } from '@/components/admin/DashboardSummary';
import { DatabaseRecordsTab } from '@/components/admin/DatabaseRecordsTab';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { listAdminDashboard } from '@/lib/artwork-upload.functions';
import { authClient } from '@/lib/auth-client';
import { getSession, requireAdmin } from '@/lib/auth.functions';
import { listAdminCategories } from '@/lib/categories.functions';

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
  loader: async () => {
    const [dashboard, categories] = await Promise.all([
      listAdminDashboard(),
      listAdminCategories(),
    ]);

    return { dashboard, categories };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();

  const { dashboard, categories } = Route.useLoaderData();

  const recordByStoragePath = new Map(
    dashboard.records.map((record) => [record.storagePath, record]),
  );
  const storageByPath = new Map(dashboard.storageFiles.map((file) => [file.path, file]));
  const missingRecords = dashboard.records.filter(
    (record) => !storageByPath.has(record.storagePath),
  );
  const untrackedFiles = dashboard.storageFiles.filter(
    (file) => !recordByStoragePath.has(file.path),
  );

  return (
    <main className='min-h-screen bg-secondary-background'>
      <header className='fixed z-10 bg-accent-2/80 w-full px-12 pt-6 pb-4'>
        <div className='max-w-300 mx-auto flex items-center flex-row justify-between md:gap-12 xl:gap-16'>
          <div className='flex items-center gap-8 xl:gap-16'>
            <h1 className='text-3xl xl:text-3xl font-semibold'>Artwork Admin Dashboard</h1>
            {/* <p className='text-base xl:text-lg'>carlastine.com</p> */}
          </div>
          <nav className='flex flex-wrap items-center gap-3 xl:gap-4'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant='ghost'
                  className='text-base group dark:hover:bg-neutral-700/80 dark:active:opacity-85 transition duration-300 hover:scale-[1.07] focus-visible:scale-[1.07] active:scale-[1]'
                >
                  <Link to='/' target='_blank'>
                    <ExternalLink className='size-5.25 text-brand-500/90 group-hover:text-brand-500' />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side='bottom'>Open website in new tab</TooltipContent>
            </Tooltip>
            <ThemeToggle className='' />
            <Button
              className='ml-2 border-brand-500 rounded-lg text-sm hover:bg-brand-200 dark:hover:bg-brand-800 cursor-pointer bg-transparent'
              variant='ghost'
              size='sm'
              onClick={async () => {
                await authClient.signOut();
                navigate({ to: '/login', search: { redirect: '/admin' } });
              }}
            >
              Sign out
            </Button>
          </nav>
        </div>
      </header>

      <div className='hidden min-[900px]:block mx-auto w-full max-w-384 px-12 pt-20 pb-6'>
        <div className='space-y-12 py-6'>
          <DashboardSummary
            dashboard={dashboard}
            untrackedFiles={untrackedFiles}
            missingRecords={missingRecords}
          />

          <Tabs defaultValue='records' className='w-full min-w-0'>
            <div className='flex flex-wrap items-center justify-between gap-4 max-w-300 w-full mx-auto'>
              {/* <div className='space-y-2'>
                <h2 className='text-3xl font-semibold tracking-tight'>Library inventory</h2>
                <p className='text-base text-muted-foreground'>
                  Compare the database snapshot against Bunny Storage.
                </p>
              </div> */}
              <TabsList variant='line'>
                <TabsTrigger className='text-base' value='records'>
                  Database Records
                </TabsTrigger>
                <TabsTrigger className='text-base' value='storage'>
                  Bunny Image Storage
                </TabsTrigger>
                <TabsTrigger className='text-base' value='categories'>
                  Categories
                </TabsTrigger>
              </TabsList>
            </div>

            <DatabaseRecordsTab
              dashboard={dashboard}
              categories={categories}
              storageByPath={storageByPath}
            />

            <BunnyStorageTab
              dashboard={dashboard}
              recordByStoragePath={recordByStoragePath}
              categories={categories}
            />

            <CategoriesTab categories={categories} />
          </Tabs>
        </div>
      </div>
      <div className='flex justify-center items-center min-[900px]:hidden mx-auto w-full px-12 pt-64 lg:pt-20 pb-6'>
        <h2 className='text-3xl font-semibold text-center'>Best viewed on larger screen</h2>
      </div>
    </main>
  );
}
