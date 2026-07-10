import type { AdminDashboard } from '@/lib/artwork-upload.functions';
import type { ArtworkRecord } from '@/lib/artworks.server';
import type { BunnyStorageFile } from '@/lib/bunny.server';
import { cn } from '@/lib/utils';

import { Card, CardTitle, CardContent } from '../ui/card';

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
      <Card className='dashboard-summary-card'>
        <CardTitle className='text-sm text-center'>Database Records</CardTitle>

        <CardContent className='text-xl tabular-nums px-0 text-center'>
          {dashboard.records.length.toLocaleString('en-US')}
        </CardContent>
      </Card>
      <Card className='dashboard-summary-card'>
        <CardTitle className='text-sm text-center'>Bunny Image Files</CardTitle>
        <CardContent className='text-xl tabular-nums px-0 text-center'>
          {dashboard.storageFiles.length.toLocaleString('en-US')}
        </CardContent>
      </Card>
      <Card
        className={cn('dashboard-summary-card', isUntrackedFiles && 'border-red-500 text-red-500')}
      >
        <CardTitle className='text-sm text-center'>Images Not in Database</CardTitle>
        <CardContent className='text-xl tabular-nums px-0 text-center'>
          {untrackedFiles.length.toLocaleString('en-US')}
        </CardContent>
      </Card>
      <Card
        className={cn('dashboard-summary-card', isMissingRecords && 'border-red-500 text-red-500')}
      >
        <CardTitle className='text-sm text-center'>Image Files Missing</CardTitle>
        <CardContent className='text-xl tabular-nums px-0 text-center'>
          {missingRecords.length.toLocaleString('en-US')}
        </CardContent>
      </Card>
      <Card className='dashboard-summary-card'>
        <CardTitle className='text-sm text-center'>Active Categories</CardTitle>
        <CardContent className='text-xl tabular-nums px-0 text-center'>
          {dashboard.activeCategories.length.toLocaleString('en-US')}
        </CardContent>
      </Card>
    </section>
  );
}
