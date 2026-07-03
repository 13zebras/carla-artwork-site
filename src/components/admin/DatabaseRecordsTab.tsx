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
import { buildBunnyCdnUrl } from '@/lib/bunny';
import type { BunnyStorageFile } from '@/lib/bunny.server';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';
// import { dateFormatter } from '@/lib/utils';

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
        <Card className='overflow-hidden rounded-sm pt-4 pb-0 border-b-0 max-w-275'>
          <CardHeader className='flex justify-between items-center gap-8'>
            <div>
              <CardTitle className='text-2xl font-semibold pb-1'>
                Database Artwork Records
              </CardTitle>
              <CardDescription>
                Full data for each image in the database with Bunny storage previews
              </CardDescription>
            </div>
            <div className='flex gap-4'>
              <ImageUploadModal categories={categories} />
              <BulkImageUploadModal categories={categories} />
            </div>
          </CardHeader>
          <CardContent className='p-0'>
            <Table className=''>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-32 text-center'>Preview</TableHead>
                  <TableHead className='text-center'>Title / Storage Path</TableHead>
                  <TableHead className='text-center'>Category</TableHead>
                  <TableHead className='w-26 text-center'>Status</TableHead>
                  {/* <TableHead className='w-28'>Storage</TableHead> */}
                  <TableHead className='w-26 text-center'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.records.map((record) => {
                  const thumbnailUrl = buildBunnyCdnUrl(record.cdnUrl, {
                    width: 100,
                    height: 100,
                    format: 'webp',
                  });
                  const previewUrl = buildBunnyCdnUrl(record.cdnUrl);
                  const hasStorageObject = storageByPath.has(record.storagePath);
                  // const createdAt = new Date(record.createdAt);
                  // const uploadedAt = Number.isNaN(createdAt.getTime())
                  //   ? '—'
                  //   : dateFormatter.format(createdAt);
                  // record.status = 'published';
                  return (
                    <>
                      <TableRow key={record.id}>
                        <TableCell className='text-center'>
                          <a
                            href={previewUrl}
                            rel='noreferrer'
                            target='_blank'
                            className='inline-flex max-h-25 max-w-25 items-center justify-center overflow-hidden bg-muted/20'
                          >
                            <img
                              alt={record.alt}
                              className='max-h-25 max-w-25 object-contain'
                              decoding='async'
                              loading='lazy'
                              src={thumbnailUrl}
                            />
                          </a>
                        </TableCell>
                        <TableCell className='whitespace-normal'>
                          <p className='text-lg font-medium leading-tight pb-3'>{record.title}</p>
                          <p className='text-xs font-mono text-muted-foreground pb-2'>
                            {record.storagePath}
                          </p>
                          {/* <p className='text-xs font-mono text-muted-foreground'>
                            Uploaded: {uploadedAt}
                          </p> */}
                        </TableCell>

                        <TableCell className='whitespace-normal'>
                          <p className='font-medium'>{record.category.label}</p>
                        </TableCell>
                        <TableCell>
                          <div className='flex flex-col items-center gap-4'>
                            <Badge
                              className='w-20'
                              variant={record.status === 'published' ? 'default' : 'outline'}
                            >
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </Badge>
                            <Badge
                              className='w-20'
                              variant={hasStorageObject ? 'default' : 'outline'}
                            >
                              {hasStorageObject ? 'Tracked' : 'Missing'}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* <TableCell>
                          <Badge variant={hasStorageObject ? 'positive' : 'destructive'}>
                            {hasStorageObject ? 'Tracked' : 'Missing'}
                          </Badge>
                        </TableCell> */}
                        <TableCell className='text-center'>
                          {/* <DatabaseActions record={record} /> */}
                          <div className='flex flex-col justify-center items-center gap-2'>
                            <ArtworkInfoModal record={record} />

                            <button className='admin-button admin-edit-button'>Edit</button>
                            <ArtworkDeleteModal record={record} />
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* <TableRow key={`${record.id}-secondary`}> */}
                      {/* <TableCell colSpan={2} className='whitespace-normal'>
                          <p className='text-xs font-mono text-muted-foreground'>
                            {record.storagePath}
                          </p>
                        </TableCell> */}

                      {/* <TableCell colSpan={2}>
                          <p className='text-xs font-mono text-muted-foreground'>
                            Uploaded: {uploadedAt}
                          </p>
                        </TableCell> */}
                      {/* </TableRow> */}
                    </>
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
