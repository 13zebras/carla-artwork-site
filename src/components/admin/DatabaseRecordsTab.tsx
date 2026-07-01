import { Link } from '@tanstack/react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

type DatabaseRecordsTabProps = {
  dashboard: AdminDashboard;
  storageByPath: Map<string, BunnyStorageFile>;
  dateFormatter: Intl.DateTimeFormat;
};

export function DatabaseRecordsTab({ dashboard, dateFormatter }: DatabaseRecordsTabProps) {
  return (
    <TabsContent value='records' className='mt-4 max-w-300 w-full mx-auto'>
      {dashboard.records.length === 0 ? (
        <Card className='rounded-sm'>
          <CardContent className='flex min-h-70 flex-col items-start justify-center gap-4 p-6'>
            <Badge variant='outline'>Empty library</Badge>
            <div className='space-y-2'>
              <h3 className='text-xl font-semibold'>No uploaded artworks yet.</h3>
              <p className='max-w-lg text-sm text-muted-foreground'>
                Use Single Upload or Bulk Upload to add images.
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button asChild>
                <Link to='/admin/upload'>Single Upload</Link>
              </Button>
              <Button asChild variant='outline'>
                <Link to='/admin/bulk'>Bulk Upload</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className='overflow-hidden rounded-sm pt-4 pb-0 border-b-0'>
          <CardHeader>
            <CardTitle className='text-xl'>Database Artwork Records</CardTitle>
            <CardDescription>
              Metadata for each image in the library with Bunny CDN previews.
            </CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            <Table className='min-w-220'>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-32'>Preview</TableHead>
                  <TableHead className='max-w-60'>Title / Storage Path</TableHead>
                  <TableHead className='w-40'>Category</TableHead>
                  <TableHead className='w-42'>Status / Storage</TableHead>
                  <TableHead className='w-32'>Dimensions</TableHead>
                  <TableHead className='w-28'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.records.map((record) => {
                  const thumbnailUrl = buildBunnyCdnUrl(record.cdnUrl, {
                    width: 120,
                    height: 120,
                    format: 'webp',
                  });
                  const previewUrl = buildBunnyCdnUrl(record.cdnUrl);
                  const hasStorageObject = false;
                  const createdAt = new Date(record.createdAt);
                  const uploadedAt = Number.isNaN(createdAt.getTime())
                    ? '—'
                    : dateFormatter.format(createdAt);
                  record.status = 'published';
                  return (
                    <>
                      <TableRow key={record.id}>
                        <TableCell rowSpan={2} className='text-center'>
                          <a
                            href={previewUrl}
                            rel='noreferrer'
                            target='_blank'
                            className='inline-flex max-h-30 max-w-30 items-center justify-center overflow-hidden bg-muted/20'
                          >
                            <img
                              alt={record.alt}
                              className='max-h-30 max-w-30 object-contain'
                              decoding='async'
                              loading='lazy'
                              src={thumbnailUrl}
                            />
                          </a>
                        </TableCell>
                        <TableCell className='whitespace-normal'>
                          <p className='font-medium leading-tight'>{record.title}</p>
                        </TableCell>

                        <TableCell className='whitespace-normal'>
                          <p className='font-medium'>{record.category.label}</p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={record.status === 'published' ? 'info' : 'outline'}
                            className='transition-none mr-2'
                          >
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </Badge>
                          <Badge variant={hasStorageObject ? 'positive' : 'destructive'}>
                            {hasStorageObject ? 'Tracked' : 'Missing'}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {record.width} × {record.height}
                        </TableCell>
                        <TableCell rowSpan={2}>
                          <div className='flex flex-col justify-center items-center gap-4'>
                            <button className='admin-info-button'>Info</button>
                            <button className='admin-edit-button'>Edit</button>
                            <button className='admin-delete-button'>Delete</button>
                          </div>
                        </TableCell>
                      </TableRow>
                      <TableRow key={`${record.id}-secondary`}>
                        <TableCell colSpan={2} className='whitespace-normal'>
                          <p className='text-xs font-mono text-muted-foreground'>
                            {record.storagePath}
                          </p>
                        </TableCell>

                        <TableCell colSpan={3}>
                          <p className='text-xs font-mono text-muted-foreground'>
                            Uploaded at: {uploadedAt}
                          </p>
                        </TableCell>
                      </TableRow>
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
