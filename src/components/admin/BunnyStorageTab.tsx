import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TabsContent } from '@/components/ui/tabs';
import type { AdminDashboard } from '@/lib/artwork-upload.functions';
import type { ArtworkRecord } from '@/lib/artworks.server';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';
import { dateFormatter } from '@/lib/utils';

import { BulkImageUploadModal } from './BulkImageUploadModal';
import { ImageUploadModal } from './ImageUploadModal';

type BunnyStorageTabProps = {
  dashboard: AdminDashboard;
  recordByStoragePath: Map<string, ArtworkRecord>;
  categories: ArtworkCategoryRecord[];
};

export function BunnyStorageTab({
  dashboard,
  recordByStoragePath,
  categories,
}: BunnyStorageTabProps) {
  return (
    <TabsContent value='storage' className='mt-4 max-w-300 w-full mx-auto'>
      {dashboard.storageFiles.length === 0 ? (
        <Card className='rounded-sm p-8'>
          <CardContent className='flex items-center justify-between gap-6'>
            <div className='flex flex-col items-start justify-start gap-6'>
              <h2 className='text-2xl font-bold'>Bunny Image Storage Is Empty</h2>
              <h3 className='text-lg font-semibold'>o artworks have been uploaded to Bunny CDN.</h3>
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
        <Card className='overflow-hidden rounded-sm pt-4 pb-0 border-b-0'>
          <CardHeader>
            <CardTitle className='text-xl'>Bunny Storage Image Files</CardTitle>
            <CardDescription>
              Images stored in Bunny CDN, with untracked files called out explicitly.
            </CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            <Table className='min-w-200'>
              <TableHeader>
                <TableRow>
                  <TableHead>Storage Path</TableHead>
                  <TableHead>Matched Record / Slug / Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className='w-54'>Modified</TableHead>
                  {/* <TableHead className='w-30'>Actions</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.storageFiles.map((file) => {
                  const record = recordByStoragePath.get(file.path);
                  const modified = file.modifiedAt ? new Date(file.modifiedAt) : null;
                  const modifiedAt =
                    modified && !Number.isNaN(modified.getTime())
                      ? dateFormatter.format(modified)
                      : '—';
                  const sizeLabel =
                    file.sizeBytes === null
                      ? '—'
                      : file.sizeBytes < 1024
                        ? `${file.sizeBytes} B`
                        : (() => {
                            const units = ['KB', 'MB', 'GB', 'TB'];
                            let size = file.sizeBytes / 1024;
                            let unitIndex = 0;

                            while (size >= 1024 && unitIndex < units.length - 1) {
                              size /= 1024;
                              unitIndex += 1;
                            }

                            return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
                          })();

                  return (
                    <TableRow key={file.path}>
                      <TableCell className='whitespace-normal font-mono text-xs'>
                        {file.path}
                      </TableCell>
                      <TableCell className='whitespace-normal'>
                        {record ? (
                          <div className='flex items-center gap-4'>
                            <div className='space-y-1'>
                              <p className='font-medium leading-tight pb-1'>{record.title}</p>
                              <p className='text-xs text-muted-foreground font-mono'>
                                {record.slug}
                              </p>
                            </div>
                            <Badge variant='positive'>Tracked</Badge>
                          </div>
                        ) : (
                          <div className='flex items-center gap-4'>
                            <span className='text-sm text-muted-foreground'>—</span>
                            <Badge variant='destructive'>Untracked</Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{sizeLabel}</TableCell>
                      <TableCell className='font-mono'>{modifiedAt}</TableCell>
                      {/* <TableCell>
                        <div className='flex flex-col justify-center items-center gap-3'>
                          <button className='admin-edit-button'>Edit</button>
                          <button className='admin-delete-button'>Delete</button>
                        </div>
                      </TableCell> */}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}
