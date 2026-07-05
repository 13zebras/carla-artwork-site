import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

import { BulkImageUploadModal } from '@/components/admin/BulkImageUploadModal';
import { BunnyStorageTab } from '@/components/admin/BunnyStorageTab';
import { CategoriesTab } from '@/components/admin/CategoriesTab';
import { DashboardSummary } from '@/components/admin/DashboardSummary';
import { DatabaseRecordsTab } from '@/components/admin/DatabaseRecordsTab';
import { ImageUploadModal } from '@/components/admin/ImageUploadModal';
import { UploadActionButtons } from '@/components/admin/UploadActionButtons';
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

  const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);
  const [isBulkImageUploadOpen, setIsBulkImageUploadOpen] = useState(false);

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
    <main className='bg-background-2nd min-h-screen'>
      <header className='z-10 fixed px-12 pt-6 pb-4 w-full bg-accent-2/80'>
        <div className='flex flex-row justify-between items-center md:gap-12 xl:gap-16 mx-auto max-w-300'>
          <div className='flex items-center gap-8 xl:gap-16'>
            <h1 className='font-semibold text-3xl xl:text-3xl'>Artwork Admin Dashboard</h1>
            {/* <p className='text-base xl:text-lg'>carlastine.com</p> */}
          </div>
          <nav className='flex flex-wrap items-center gap-3 xl:gap-4'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant='ghost'
                  className='group dark:hover:bg-neutral-700/80 dark:active:opacity-85 text-base hover:scale-[1.07] focus-visible:scale-[1.07] active:scale-[1] transition duration-300'
                >
                  <Link to='/' target='_blank'>
                    <ExternalLink className='size-5.25 text-brand-600 dark:text-brand-500/90 group-hover:text-brand-500' />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side='bottom'>Open website in new tab</TooltipContent>
            </Tooltip>
            <ThemeToggle className='' />
            <Button
              className='bg-transparent hover:bg-brand-200 dark:hover:bg-brand-800 ml-2 border-brand-500 rounded-lg text-sm cursor-pointer'
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

      <div className='hidden min-[900px]:block mx-auto px-12 pt-20 pb-6 w-full max-w-384'>
        <div className='space-y-12 py-6'>
          <DashboardSummary
            dashboard={dashboard}
            untrackedFiles={untrackedFiles}
            missingRecords={missingRecords}
          />

          <Tabs defaultValue='records' className='w-full min-w-0'>
            <div className='flex flex-wrap justify-between items-center gap-4 mx-auto w-full max-w-300'>
              {/* <div className='space-y-2'>
                <h2 className='font-semibold text-3xl tracking-tight'>Library inventory</h2>
                <p className='text-muted-foreground text-base'>
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
              <UploadActionButtons
                onImageUpload={() => setIsImageUploadOpen(true)}
                onBulkImageUpload={() => setIsBulkImageUploadOpen(true)}
              />
            </div>

            <DatabaseRecordsTab
              dashboard={dashboard}
              categories={categories}
              storageByPath={storageByPath}
              // untrackedFiles={untrackedFiles}
            />

            <BunnyStorageTab
              dashboard={dashboard}
              recordByStoragePath={recordByStoragePath}
              categories={categories}
              untrackedFiles={untrackedFiles}
            />

            <CategoriesTab categories={categories} />
          </Tabs>
        </div>
      </div>
      <div className='min-[900px]:hidden flex justify-center items-center mx-auto px-12 pt-64 lg:pt-20 pb-6 w-full'>
        <h2 className='font-semibold text-3xl text-center'>Best viewed on larger screen</h2>
      </div>

      <ImageUploadModal
        categories={categories}
        untrackedFiles={untrackedFiles}
        open={isImageUploadOpen}
        onOpenChange={setIsImageUploadOpen}
      />
      <BulkImageUploadModal
        categories={categories}
        open={isBulkImageUploadOpen}
        onOpenChange={setIsBulkImageUploadOpen}
      />
    </main>
  );
}
