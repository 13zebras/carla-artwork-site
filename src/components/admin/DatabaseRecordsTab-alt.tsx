import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { TabsContent } from '@/components/ui/tabs';
import type { AdminDashboard } from '@/lib/artwork-upload.functions';
import { buildBunnyCdnUrl } from '@/lib/bunny';
import type { BunnyStorageFile } from '@/lib/bunny.server';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';
import { dateFormatter } from '@/lib/utils';

import { ArtworkDeleteModal } from './ArtworkDeleteModal';
import { ArtworkInfoModal } from './ArtworkInfoModal';
import { BulkImageUploadModal } from './BulkImageUploadModal';
import { ImageUploadModal } from './ImageUploadModal';

type DatabaseRecordsTabProps = {
  dashboard: AdminDashboard;
  categories: ArtworkCategoryRecord[];
  storageByPath: Map<string, BunnyStorageFile>;
};

export function DatabaseRecordsTab({
  dashboard,
  categories,
  storageByPath,
}: DatabaseRecordsTabProps) {
  return (
    <TabsContent value='records' className='mt-4 max-w-300 w-full mx-auto'>
      {dashboard.records.length === 0 ? (
        <Card className='rounded-sm p-8'>
          <CardContent className='flex items-center justify-between gap-6'>
            <div className='flex flex-col items-start justify-start gap-6'>
              <h2 className='text-2xl font-bold'>Empty Image Database</h2>
              <h3 className='text-lg font-semibold'>No uploaded artworks saved in the database.</h3>
            </div>
            <div className='flex flex-col items-start justify-between gap-6'>
              <h4 className='max-w-sm text-lg text-muted-foreground'>
                Add images to save in the database.
              </h4>
              <div className='flex gap-4'>
                <ImageUploadModal categories={categories} />
                <BulkImageUploadModal categories={categories} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Table to display the artwork records
        <>
          <Card className='overflow-hidden rounded-sm py-4 mb-8'>
            <CardHeader className='flex justify-between items-center gap-8'>
              <div>
                <CardTitle className='text-2xl font-semibold pb-1'>
                  Database Artwork Records
                </CardTitle>
                <CardDescription>
                  Full data for each image in the database with Bunny storage previews.
                </CardDescription>
              </div>
              <div className='flex gap-4'>
                <ImageUploadModal categories={categories} />
                <BulkImageUploadModal categories={categories} />
              </div>
            </CardHeader>
          </Card>
          {dashboard.records.map((record) => {
            const thumbnailUrl = buildBunnyCdnUrl(record.cdnUrl, {
              width: 80,
              height: 80,
              format: 'webp',
            });
            const previewUrl = buildBunnyCdnUrl(record.cdnUrl);
            const hasStorageObject = storageByPath.has(record.storagePath);
            const createdAt = new Date(record.createdAt);
            const uploadedAt = Number.isNaN(createdAt.getTime())
              ? '—'
              : dateFormatter.format(createdAt);
            record.status = 'published';
            return (
              <Card key={record.slug}>
                <CardContent className='flex'>
                  <div className='text-center'>
                    <a
                      href={previewUrl}
                      rel='noreferrer'
                      target='_blank'
                      className='inline-flex max-h-20 max-w-20 items-center justify-center overflow-hidden bg-muted/20'
                    >
                      <img
                        alt={record.alt}
                        className='max-h-30 max-w-30 object-contain'
                        decoding='async'
                        loading='lazy'
                        src={thumbnailUrl}
                      />
                    </a>
                  </div>
                  <div className='whitespace-normal'>
                    <p className='font-medium leading-tight'>Name: {record.title}</p>
                    <p className='text-xs font-mono text-muted-foreground'>{record.storagePath}</p>
                  </div>

                  <div className='whitespace-normal'>
                    <p className='font-medium'>{record.category.label}</p>
                  </div>
                  <div>
                    <Badge
                      variant={record.status === 'published' ? 'info' : 'outline'}
                      className='transition-none mr-2'
                    >
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </Badge>
                  </div>

                  <div>
                    <Badge variant={hasStorageObject ? 'positive' : 'destructive'}>
                      {hasStorageObject ? 'Tracked' : 'Missing'}
                    </Badge>
                  </div>
                  <div>
                    <div className='flex flex-col justify-center items-center gap-2'>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className='admin-info-button'>Info</button>
                        </DialogTrigger>
                        <ArtworkInfoModal record={record} />
                      </Dialog>
                      <button className='admin-edit-button'>Edit</button>
                      <ArtworkDeleteModal record={record} />
                    </div>
                  </div>
                  <div className='whitespace-normal'>
                    <p className='text-xs font-mono text-muted-foreground'>{record.storagePath}</p>
                  </div>

                  <div>
                    <p className='text-xs font-mono text-muted-foreground'>
                      Uploaded: {uploadedAt}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
    </TabsContent>
  );
}
