import { useRouter } from '@tanstack/react-router';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
import { updateArtwork, type AdminDashboard } from '@/lib/functions/artwork-upload.functions';
import type { ArtworkRecord } from '@/lib/shared/artworks.types';
import { buildBunnyCdnUrl } from '@/lib/shared/bunny';
import type { BunnyStorageFile } from '@/lib/shared/bunny.types';
import type { ArtworkCategoryRecord } from '@/lib/shared/categories.types';

import { ArtworkDeleteModal } from './ArtworkDeleteModal';
import { ArtworkEditModal } from './ArtworkEditModal';
import { ArtworkInfoDrawer } from './ArtworkInfoDrawer';

type DatabaseRecordsTabProps = {
  dashboard: AdminDashboard;
  activeCategories: ArtworkCategoryRecord[];
  storageByPath: Map<string, BunnyStorageFile>;
};

const MINIMUM_STATUS_FEEDBACK_MS = 400;

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function DatabaseRecordsTab({
  dashboard,
  activeCategories,
  storageByPath,
}: DatabaseRecordsTabProps) {
  const router = useRouter();
  const [infoRecord, setInfoRecord] = useState<ArtworkRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ArtworkRecord | null>(null);
  const [editRecord, setEditRecord] = useState<ArtworkRecord | null>(null);
  const [updatingStatusIds, setUpdatingStatusIds] = useState<Set<string>>(() => new Set());
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ArtworkRecord['status']>>(
    {},
  );

  useEffect(() => {
    setStatusOverrides((current) => {
      const next = { ...current };
      let didChange = false;

      for (const record of dashboard.records) {
        if (next[record.id] === record.status) {
          delete next[record.id];
          didChange = true;
        }
      }

      return didChange ? next : current;
    });
  }, [dashboard.records]);

  function openInfo(record: ArtworkRecord) {
    setInfoRecord(record);
  }

  function openDelete(record: ArtworkRecord) {
    setDeleteRecord(record);
  }

  function openEdit(record: ArtworkRecord) {
    setEditRecord(record);
  }

  async function toggleStatus(record: ArtworkRecord, currentStatus: ArtworkRecord['status']) {
    if (updatingStatusIds.has(record.id)) {
      return;
    }

    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    const startedAt = Date.now();

    setUpdatingStatusIds((current) => new Set(current).add(record.id));
    setStatusOverrides((current) => ({ ...current, [record.id]: nextStatus }));

    try {
      await updateArtwork({
        data: {
          id: record.id,
          title: record.title,
          categoryId: record.categoryId,
          alt: record.alt,
          description: record.description,
          sortOrder: record.sortOrder,
          status: nextStatus,
        },
      });

      const remainingFeedbackTime = Math.max(
        0,
        MINIMUM_STATUS_FEEDBACK_MS - (Date.now() - startedAt),
      );
      await Promise.all([router.invalidate(), wait(remainingFeedbackTime)]);

      toast.success(`Artwork ${nextStatus === 'published' ? 'published' : 'moved to draft'}`, {
        description: record.title,
      });
    } catch (error) {
      setStatusOverrides((current) => {
        const next = { ...current };
        delete next[record.id];
        return next;
      });
      const message = error instanceof Error ? error.message : 'Unable to update artwork status.';
      toast.error('Status update failed', { description: message });
    } finally {
      setUpdatingStatusIds((current) => {
        const next = new Set(current);
        next.delete(record.id);
        return next;
      });
    }
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
                  <TableHead className='w-26 lg:w-30 text-center'>Status</TableHead>
                  <TableHead className='w-34 lg:w-40 xl:w-50 text-center'>Actions</TableHead>
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
                  const displayedStatus = statusOverrides[record.id] ?? record.status;
                  const isUpdatingStatus = updatingStatusIds.has(record.id);
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
                        <p className='font-mono text-muted-foreground text-xs'>
                          {record.storagePath}
                        </p>
                      </TableCell>
                      <TableCell className='px-3 whitespace-normal'>
                        <p className='font-medium'>{record.category.label}</p>
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col items-center gap-4'>
                          <Button
                            variant={displayedStatus === 'published' ? 'vibrant' : 'outline'}
                            size='xs'
                            className='rounded-lg w-21 transition-colors duration-300 ease-out disabled:opacity-80'
                            disabled={isUpdatingStatus}
                            aria-label={`Change ${record.title} status to ${displayedStatus === 'published' ? 'draft' : 'published'}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              void toggleStatus(record, displayedStatus);
                            }}
                          >
                            {isUpdatingStatus ? (
                              <>
                                <LoaderCircle className='animate-spin' />
                                Saving…
                              </>
                            ) : (
                              displayedStatus.charAt(0).toUpperCase() + displayedStatus.slice(1)
                            )}
                          </Button>
                          <Badge
                            className='w-21 cursor-default'
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
                        <div className='flex flex-col items-center gap-2.5'>
                          <Button
                            variant='information'
                            size='xs'
                            className='w-20'
                            onClick={() => openInfo(record)}
                          >
                            Info
                          </Button>
                          <Button
                            variant='positive'
                            size='xs'
                            className='w-20'
                            onClick={() => openEdit(record)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant='destructive'
                            size='xs'
                            className='w-20'
                            onClick={() => openDelete(record)}
                          >
                            Delete
                          </Button>
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
