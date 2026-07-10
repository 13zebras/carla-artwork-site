import { useState } from 'react';

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
import type { ArtworkRecord } from '@/lib/artworks.server';
import { buildBunnyCdnUrl } from '@/lib/bunny';
import type { BunnyStorageFile } from '@/lib/bunny.server';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';

import { ArtworkDeleteModal } from './ArtworkDeleteModal';
import { ArtworkEditModal } from './ArtworkEditModal';
import { ArtworkInfoDrawer } from './ArtworkInfoDrawer';

type DatabaseRecordsTabProps = {
  dashboard: AdminDashboard;
  activeCategories: ArtworkCategoryRecord[];
  storageByPath: Map<string, BunnyStorageFile>;
};

export function DatabaseRecordsTab({
  dashboard,
  activeCategories,
  storageByPath,
}: DatabaseRecordsTabProps) {
  const [infoRecord, setInfoRecord] = useState<ArtworkRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ArtworkRecord | null>(null);
  const [editRecord, setEditRecord] = useState<ArtworkRecord | null>(null);

  function openInfo(record: ArtworkRecord) {
    setInfoRecord(record);
  }

  function openDelete(record: ArtworkRecord) {
    setDeleteRecord(record);
  }

  function openEdit(record: ArtworkRecord) {
    setEditRecord(record);
  }

  return (
    <TabsContent value='records' className='mx-auto mt-4 w-full max-w-300'>
      {dashboard.records.length === 0 ? (
        // EMPTY DATABASE STATE
        <Card className='p-8 rounded-sm h-40'>
          <CardContent className='flex flex-col justify-center items-start gap-6 h-full'>
            <h2 className='font-bold text-xl'>Empty Image Database</h2>
            <h3 className='font-semibold text-base'>No uploaded artworks saved in the database.</h3>
          </CardContent>
        </Card>
      ) : (
        // TABLE OF DATABASE RECORDS
        <Card className='gap-5 pt-5 pb-0 border-b-0 rounded-sm w-full max-w-300 overflow-hidden'>
          <CardHeader className='flex flex-col gap-2'>
            <CardTitle className='font-semibold text-xl'>Database Artwork Records</CardTitle>
            <CardDescription>
              Full data for each image in the database with Bunny storage previews
            </CardDescription>
          </CardHeader>
          <CardContent className='p-0'>
            <Table className=''>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-32 text-center'>Preview</TableHead>
                  <TableHead className='text-center'>Title / Storage Path</TableHead>
                  <TableHead className='text-center'>Category</TableHead>
                  <TableHead className='w-26 lg:w-29 xl:w-32 text-center'>Status</TableHead>

                  <TableHead className='w-26 lg:w-29 xl:w-32 text-center'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.records.map((record) => {
                  const thumbnailUrl = buildBunnyCdnUrl(record.cdnUrl, {
                    width: 100,
                    height: 100,
                    format: 'webp',
                  });
                  const hasStorageObject = storageByPath.has(record.storagePath);
                  return (
                    <TableRow
                      key={record.id}
                      tabIndex={0}
                      className='focus-visible:bg-muted/40 focus-visible:outline-none cursor-pointer'
                      onClick={() => openInfo(record)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openInfo(record);
                        }
                      }}
                    >
                      <TableCell className='text-center'>
                        <img
                          alt={record.alt}
                          className='inline-flex justify-center items-center bg-muted/20 max-w-25 max-h-25 object-contain overflow-hidden'
                          decoding='async'
                          loading='lazy'
                          src={thumbnailUrl}
                        />
                      </TableCell>
                      <TableCell className='px-3 whitespace-normal'>
                        <p className='pb-3 font-medium text-lg leading-tight'>{record.title}</p>
                        <p className='pb-2 font-mono text-muted-foreground text-xs'>
                          {record.storagePath}
                        </p>
                      </TableCell>

                      <TableCell className='px-3 whitespace-normal'>
                        <p className='font-medium'>{record.category.label}</p>
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col items-center gap-4'>
                          <Badge
                            className='w-20'
                            variant={record.status === 'published' ? 'info' : 'outline'}
                          >
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </Badge>
                          <Badge
                            className='w-20'
                            variant={hasStorageObject ? 'positive' : 'destructive'}
                          >
                            {hasStorageObject ? 'Tracked' : 'Missing'}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell
                        className='text-center cursor-default'
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className='flex flex-col items-center gap-3'>
                          <Button
                            variant='information'
                            size='xs'
                            className='w-18'
                            onClick={() => openInfo(record)}
                          >
                            Info
                          </Button>
                          <Button
                            variant='positive'
                            size='xs'
                            className='w-18'
                            onClick={() => openEdit(record)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant='destructive'
                            size='xs'
                            className='w-18'
                            onClick={() => openDelete(record)}
                          >
                            Delete
                          </Button>
                          {/* <DatabaseActions
                            record={record}
                            onInfo={openInfo}
                            onEdit={openEdit}
                            onDelete={openDelete}
                          /> */}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {infoRecord ? (
        <ArtworkInfoDrawer
          key={infoRecord.id}
          record={infoRecord}
          onClose={() => setInfoRecord(null)}
        />
      ) : null}

      {editRecord ? (
        <ArtworkEditModal
          key={editRecord.id}
          record={editRecord}
          activeCategories={activeCategories}
          onClose={() => setEditRecord(null)}
        />
      ) : null}

      {deleteRecord ? (
        <ArtworkDeleteModal
          key={deleteRecord.id}
          record={deleteRecord}
          onClose={() => setDeleteRecord(null)}
        />
      ) : null}
    </TabsContent>
  );
}
