import type { AdminDashboard } from '@/lib/functions/artwork-upload.functions';
import type { ArtworkRecord } from '@/lib/shared/artworks.types';
import type { BunnyStorageFile } from '@/lib/shared/bunny.types';
import { cn } from '@/lib/shared/utils';

import { Card, CardTitle, CardContent } from '../ui/card';

const dashboardSummaryCard =
  'apply w-30 xl:w-36 h-24 justify-center items-center gap-3 px-3 py-2 shrink-0 bg-card/70 shadow-sm';

type DashboardSummaryProps = {
  dashboard: AdminDashboard;
  untrackedFiles: BunnyStorageFile[];
  missingRecords: ArtworkRecord[];
};

export function DashboardSummary({
  dashboard,
  untrackedFiles,
  missingRecords,
}: DashboardSummaryProps) {
  const isMissingRecords = missingRecords.length > 0;
  const isUntrackedFiles = untrackedFiles.length > 0;
  return (
    <section className='flex flex-wrap justify-center gap-4 lg:gap-6'>
      <Card className={dashboardSummaryCard}>
        <CardTitle className='text-sm text-center'>Database Records</CardTitle>

        <CardContent className='px-0 tabular-nums text-xl text-center'>
          {dashboard.records.length.toLocaleString('en-US')}
        </CardContent>
      </Card>
      <Card className={dashboardSummaryCard}>
        <CardTitle className='text-sm text-center'>Bunny Image Files</CardTitle>
        <CardContent className='px-0 tabular-nums text-xl text-center'>
          {dashboard.storageFiles.length.toLocaleString('en-US')}
        </CardContent>
      </Card>
      <Card className={cn(dashboardSummaryCard, isUntrackedFiles && 'border-red-500 text-red-500')}>
        <CardTitle className='text-sm text-center'>Images Not in Database</CardTitle>
        <CardContent className='px-0 tabular-nums text-xl text-center'>
          {untrackedFiles.length.toLocaleString('en-US')}
        </CardContent>
      </Card>
      <Card className={cn(dashboardSummaryCard, isMissingRecords && 'border-red-500 text-red-500')}>
        <CardTitle className='text-sm text-center'>Image Files Missing</CardTitle>
        <CardContent className='px-0 tabular-nums text-xl text-center'>
          {missingRecords.length.toLocaleString('en-US')}
        </CardContent>
      </Card>
      <Card className={dashboardSummaryCard}>
        <CardTitle className='text-sm text-center'>Active Categories</CardTitle>
        <CardContent className='px-0 tabular-nums text-xl text-center'>
          {dashboard.activeCategories.length.toLocaleString('en-US')}
        </CardContent>
      </Card>
    </section>
  );
}
