import { Link, createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

import { AboutTab } from '@/components/admin/AboutTab';
import { BulkImageUploadModal } from '@/components/admin/BulkImageUploadModal';
import { BunnyStorageTab } from '@/components/admin/BunnyStorageTab';
import { CategoriesTab } from '@/components/admin/CategoriesTab';
import { DashboardSummary } from '@/components/admin/DashboardSummary';
import { DatabaseRecordsTab } from '@/components/admin/DatabaseRecordsTab';
import { DemoModeSwitch } from '@/components/admin/DemoModeSwitch';
import { ImageUploadModal } from '@/components/admin/ImageUploadModal';
import { UploadActionButtons } from '@/components/admin/UploadActionButtons';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { authClient } from '@/lib/client/auth-client';
import { listAdminDashboard, type AdminDashboard } from '@/lib/functions/artwork-upload.functions';
import { getSession, requireAdmin } from '@/lib/functions/auth.functions';
import { cn } from '@/lib/shared/utils';

function mergeCategories(
  activeCategories: AdminDashboard['activeCategories'],
  archivedCategories: AdminDashboard['activeCategories'],
) {
  return [...activeCategories, ...archivedCategories].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  );
}

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
  loader: async () => listAdminDashboard(),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();

  const { dashboard, archivedCategories, demoMode, about } = Route.useLoaderData();
  const { activeCategories } = dashboard;
  const allCategories = mergeCategories(activeCategories, archivedCategories);

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
          </div>
          <nav className='flex flex-wrap items-center gap-3 xl:gap-4'>
            <DemoModeSwitch demoMode={demoMode} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant='ghost'
                  className='group dark:hover:bg-neutral-700/80 dark:active:opacity-85 text-base hover:scale-[1.07] focus-visible:scale-[1.07] active:scale-[1] transition duration-100'
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
              className='bg-black hover:bg-brand-600 dark:hover:bg-brand-800 ml-2 px-4 border-neutral-700 hover:border-brand-600 rounded-xl text-white text-sm cursor-pointer'
              variant='outline'
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

      <div
        className={cn(
          'hidden min-[950px]:block mx-auto px-12 pt-20 pb-6 w-full max-w-384',
          dashboard.records.length === 0 && 'max-w-250',
        )}
      >
        <div className='space-y-12 py-6'>
          <DashboardSummary
            dashboard={dashboard}
            untrackedFiles={untrackedFiles}
            missingRecords={missingRecords}
          />

          <Tabs defaultValue='records' className='w-full min-w-0'>
            <div className='flex flex-wrap justify-between items-center gap-4 mx-auto pr-2 w-full max-w-300'>
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
                <TabsTrigger className='text-base' value='about'>
                  About
                </TabsTrigger>
              </TabsList>
              <UploadActionButtons
                onImageUpload={() => setIsImageUploadOpen(true)}
                onBulkImageUpload={() => setIsBulkImageUploadOpen(true)}
              />
            </div>

            <DatabaseRecordsTab
              dashboard={dashboard}
              activeCategories={activeCategories}
              storageByPath={storageByPath}
            />

            <BunnyStorageTab dashboard={dashboard} recordByStoragePath={recordByStoragePath} />

            <CategoriesTab allCategories={allCategories} />

            <AboutTab key={about.updatedAt} about={about} />
          </Tabs>
        </div>
      </div>
      <div className='min-[950px]:hidden flex justify-center items-center mx-auto px-12 pt-64 lg:pt-20 pb-6 w-full'>
        <h2 className='font-semibold text-3xl text-center'>Best viewed on larger screen</h2>
      </div>

      <ImageUploadModal
        activeCategories={activeCategories}
        untrackedFiles={untrackedFiles}
        open={isImageUploadOpen}
        onOpenChange={setIsImageUploadOpen}
      />
      <BulkImageUploadModal
        activeCategories={activeCategories}
        open={isBulkImageUploadOpen}
        onOpenChange={setIsBulkImageUploadOpen}
      />
    </main>
  );
}
