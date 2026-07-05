import { X } from 'lucide-react';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import type { ArtworkRecord } from '@/lib/artworks.server';
import { buildBunnyCdnUrl } from '@/lib/bunny';
import { dateFormatter } from '@/lib/utils';

import { Dialog, DialogContent, DialogClose, DialogTrigger } from '../ui/dialog';

type ArtworkInfoDrawerProps = {
  record: ArtworkRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ArtworkInfoDrawer({ record, open, onOpenChange }: ArtworkInfoDrawerProps) {
  return (
    <Drawer swipeDirection='right' open={open} onOpenChange={onOpenChange}>
      {record ? <ArtworkInfoDrawerContent record={record} /> : null}
    </Drawer>
  );
}

function ArtworkInfoDrawerContent({ record }: { record: ArtworkRecord }) {
  const thumbnailUrl = buildBunnyCdnUrl(record.cdnUrl, {
    width: 480,
    height: 480,
    format: 'webp',
  });

  const previewUrl = buildBunnyCdnUrl(record.cdnUrl);

  const createdAt = new Date(record.createdAt);
  const updatedAt = new Date(record.updatedAt);

  const rows: Array<[string, string]> = [
    ['Title', record.title],
    ['Category', record.category.label],
    ['Status', record.status],
    ['Description', record.description ?? '—'],
    ['Alt text', record.alt],
    ['Original filename', record.originalFilename],
    ['Storage path', record.storagePath],
    ['Content type', record.contentType],
    ['Dimensions', `${record.width} x ${record.height}`],
    ['Size (bytes)', String(record.sizeBytes)],
    ['Created', Number.isNaN(createdAt.getTime()) ? '—' : dateFormatter.format(createdAt)],
    ['Updated', Number.isNaN(updatedAt.getTime()) ? '—' : dateFormatter.format(updatedAt)],
  ];

  return (
    <DrawerContent className='rounded-lg gap-0 data-[swipe-axis=x]:sm:[--drawer-content-width:37.5rem]'>
      <DrawerHeader className='relative p-6 pb-4'>
        <DrawerTitle className='text-xl font-semibold'>{record.title} - Details</DrawerTitle>
        <DrawerClose
          aria-label='Close'
          className='absolute right-6 top-6 flex justify-center items-center rounded-md size-6 hover:bg-neutral-300 dark:hover:bg-neutral-700 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text'
        >
          <X className='size-4' />
        </DrawerClose>
      </DrawerHeader>
      <div className='flex min-h-0 flex-1 flex-col'>
        <div className='min-h-0 px-6 overflow-y-auto'>
          <Table>
            <TableBody>
              {rows.map(([label, value]) => (
                <TableRow key={label}>
                  <TableCell className='w-40 align-top font-medium text-muted-foreground'>
                    {label}
                  </TableCell>
                  <TableCell className='align-top break-all whitespace-normal'>{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <div className='flex min-h-65 flex-1 items-center justify-center p-6'>
              <img
                alt={record.alt}
                className='max-h-full max-w-full object-contain'
                decoding='async'
                loading='lazy'
                src={thumbnailUrl}
              />
            </div>
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            overlayClassName='bg-black/70 backdrop-blur-xs'
            className='w-screen h-screen rounded-none border-0 bg-transparent p-0'
          >
            <DialogClose className='w-full h-full flex items-center justify-center'>
              <img
                alt={record.alt}
                className='max-h-[90vh] h-full w-full max-w-[90vw] object-contain'
                decoding='async'
                loading='lazy'
                src={previewUrl}
              />
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>
    </DrawerContent>
  );
}
