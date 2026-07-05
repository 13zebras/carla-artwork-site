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
import type { BunnyStorageFile } from '@/lib/bunny.server';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';
import { dateFormatter } from '@/lib/utils';

import { BulkImageUploadModal } from './BulkImageUploadModal';
import { ImageUploadModal } from './ImageUploadModal';

type BunnyStorageTabProps = {
  dashboard: AdminDashboard;
  recordByStoragePath: Map<string, ArtworkRecord>;
  categories: ArtworkCategoryRecord[];
  untrackedFiles: BunnyStorageFile[];
};

function formatSizeLabel(sizeBytes: BunnyStorageFile['sizeBytes']) {
  if (sizeBytes === null) {
    return '—';
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = sizeBytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const fractionDigits = size >= 10 ? 0 : 1;

  return `${size.toFixed(fractionDigits)} ${units[unitIndex]}`;
}

export function BunnyStorageTab({
  dashboard,
  recordByStoragePath,
  categories,
  untrackedFiles,
}: BunnyStorageTabProps) {
  return (
    <TabsContent value='storage' className='mx-auto mt-4 w-full max-w-300'>
      {dashboard.storageFiles.length === 0 ? (
        <Card className='p-8 rounded-sm'>
          <CardContent className='flex justify-between items-center gap-6'>
            <div className='flex flex-col justify-start items-start gap-6'>
              <h2 className='font-bold text-2xl'>Bunny Image Storage Is Empty</h2>
              <h3 className='font-semibold text-lg'>o artworks have been uploaded to Bunny CDN.</h3>
            </div>
            <div className='flex flex-col justify-between items-start gap-6'>
              <h4 className='max-w-sm text-muted-foreground text-lg'>
                Add images to save in the database.
              </h4>
              <div className='flex gap-4'>
                <ImageUploadModal categories={categories} untrackedFiles={untrackedFiles} />
                <BulkImageUploadModal categories={categories} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className='pt-4 pb-0 border-b-0 rounded-sm overflow-hidden'>
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
                  <TableHead>Matched Database Record</TableHead>
                  <TableHead className='w-26'>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className='w-48'>Modified</TableHead>
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
                  const sizeLabel = formatSizeLabel(file.sizeBytes);

                  return (
                    <TableRow key={file.path}>
                      <TableCell className='font-mono text-xs whitespace-normal'>
                        {file.path}
                      </TableCell>
                      <TableCell className='whitespace-normal'>
                        <div className='flex justify-between items-center'>
                          {record ? (
                            <p className='pb-1 font-medium leading-tight'>{record.title}</p>
                          ) : (
                            <span className='text-muted-foreground text-sm'>—</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className='whitespace-normal'>
                        <div className='flex justify-center items-center'>
                          <Badge variant={record ? 'positive' : 'destructive'} className='w-21'>
                            {record ? 'DB Record' : 'Not in DB'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{sizeLabel}</TableCell>
                      <TableCell className='font-normal'>{modifiedAt}</TableCell>
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
