import { createFileRoute } from '@tanstack/react-router';

import { BunnyStorageTab } from '@/components/admin/BunnyStorageTab';
import { CategoriesTab } from '@/components/admin/CategoriesTab';
import { DashboardSummary } from '@/components/admin/DashboardSummary';
import { DatabaseRecordsTab } from '@/components/admin/DatabaseRecordsTab';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listAdminDashboard } from '@/lib/artwork-upload.functions';
import { listAdminCategories } from '@/lib/categories.functions';

export const Route = createFileRoute('/admin/')({
  loader: async () => {
    const [dashboard, categories] = await Promise.all([
      listAdminDashboard(),
      listAdminCategories(),
    ]);

    return { dashboard, categories };
  },
  component: AdminDashboardPage,
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function AdminDashboardPage() {
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
    <div className='space-y-12 py-6'>
      <DashboardSummary
        dashboard={dashboard}
        untrackedFiles={untrackedFiles}
        missingRecords={missingRecords}
      />

      <Tabs defaultValue='records' className='w-full min-w-0'>
        <div className='flex flex-wrap items-center justify-between gap-3 max-w-300 w-full mx-auto'>
          <div className='space-y-2'>
            <h2 className='text-3xl font-semibold tracking-tight'>Library inventory</h2>
            <p className='text-base text-muted-foreground'>
              Compare the database snapshot against Bunny Storage.
            </p>
          </div>
          <TabsList variant='line'>
            <TabsTrigger className='text-base' value='records'>
              Database Records
            </TabsTrigger>
            <TabsTrigger className='text-base' value='storage'>
              Bunny CDN Image Storage
            </TabsTrigger>
            <TabsTrigger className='text-base' value='categories'>
              Categories
            </TabsTrigger>
          </TabsList>
        </div>

        <DatabaseRecordsTab
          dashboard={dashboard}
          storageByPath={storageByPath}
          dateFormatter={dateFormatter}
        />

        <BunnyStorageTab
          dashboard={dashboard}
          recordByStoragePath={recordByStoragePath}
          dateFormatter={dateFormatter}
        />

        <CategoriesTab categories={categories} dateFormatter={dateFormatter} />
      </Tabs>
    </div>
  );
}
