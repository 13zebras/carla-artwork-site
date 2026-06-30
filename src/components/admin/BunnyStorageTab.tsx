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

type BunnyStorageTabProps = {
  dashboard: AdminDashboard;
  recordByStoragePath: Map<string, ArtworkRecord>;
  dateFormatter: Intl.DateTimeFormat;
};

export function BunnyStorageTab({
  dashboard,
  recordByStoragePath,
  dateFormatter,
}: BunnyStorageTabProps) {
  return (
    <TabsContent value='storage' className='mt-4 max-w-300 w-full mx-auto'>
      <Card className='overflow-hidden rounded-sm pt-4 pb-0 border-b-0'>
        <CardHeader>
          <CardTitle className='text-xl'>Bunny Storage Image Files</CardTitle>
          <CardDescription>
            Images stored in Bunny CDN, with untracked files called out explicitly.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-0'>
          {dashboard.storageFiles.length === 0 ? (
            <div className='flex min-h-60 items-center justify-center p-6 text-sm text-muted-foreground'>
              No Bunny storage image files found on Bunny CDN.
            </div>
          ) : (
            <Table className='min-w-240'>
              <TableHeader>
                <TableRow>
                  <TableHead>Storage Path</TableHead>
                  <TableHead>Matched Record / Slug / Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className='w-54'>Modified</TableHead>
                  <TableHead className='w-30'>Actions</TableHead>
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
                      <TableCell>
                        <div className='flex flex-col justify-center items-center gap-3'>
                          <button className='admin-edit-button'>Edit</button>
                          <button className='admin-delete-button'>Delete</button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}
