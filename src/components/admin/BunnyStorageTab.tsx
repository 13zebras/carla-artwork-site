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
import { dateFormatter } from '@/lib/utils';

type BunnyStorageTabProps = {
  dashboard: AdminDashboard;
  recordByStoragePath: Map<string, ArtworkRecord>;
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

export function BunnyStorageTab({ dashboard, recordByStoragePath }: BunnyStorageTabProps) {
  return (
    <TabsContent value='storage' className='mx-auto mt-4 w-full max-w-300'>
      {dashboard.storageFiles.length === 0 ? (
        <Card className='p-8 rounded-sm h-40'>
          <CardContent className='flex flex-col justify-center items-start gap-6 h-full'>
            <h2 className='font-bold text-xl'>Empty Bunny Image Storage</h2>
            <h3 className='font-semibold text-base'>
              No artworks have been uploaded to Bunny CDN.
            </h3>
          </CardContent>
        </Card>
      ) : (
        <Card className='gap-5 pt-5 pb-0 border-b-0 rounded-sm w-full max-w-300 overflow-hidden'>
          <CardHeader className='flex flex-col gap-2'>
            <CardTitle className='font-semibold text-xl'>Bunny Storage Image Files</CardTitle>
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
