import { useEffect, useState } from 'react';

import { XIcon } from 'lucide-react';

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
  record: ArtworkRecord;
  onClose: () => void;
};

export function ArtworkInfoDrawer({ record, onClose }: ArtworkInfoDrawerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
  }

  function handleOpenChangeComplete(isOpen: boolean) {
    if (!isOpen) {
      onClose();
    }
  }

  return (
    <Drawer
      swipeDirection='right'
      open={open}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={handleOpenChangeComplete}
    >
      <ArtworkInfoDrawerContent record={record} />
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
    <DrawerContent className='gap-0 rounded-lg data-[swipe-axis=x]:sm:[--drawer-content-width:37.5rem]'>
      <DrawerHeader className='relative p-6 pb-4'>
        <DrawerTitle className='font-semibold text-xl'>{record.title} - Details</DrawerTitle>
        <DrawerClose
          aria-label='Close'
          className='top-4 right-4 absolute flex justify-center items-center dark:hover:bg-neutral-800 opacity-80 hover:opacity-100 rounded-full focus:outline-hidden focus:ring-2 focus:ring-ring ring-offset-background focus:ring-offset-3 size-6 hover:scale-120 transition-all hover:bg-accent-2'
        >
          <XIcon className='size-5' />
        </DrawerClose>
      </DrawerHeader>
      <div className='flex flex-col flex-1 min-h-0'>
        <div className='px-6 min-h-0 overflow-y-auto'>
          <Table>
            <TableBody>
              {rows.map(([label, value]) => (
                <TableRow key={label}>
                  <TableCell className='w-40 font-medium text-muted-foreground align-top'>
                    {label}
                  </TableCell>
                  <TableCell className='break-all align-top whitespace-normal'>{value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <div className='flex flex-1 justify-center items-center p-6 min-h-65'>
              <img
                alt={record.alt}
                className='max-w-full max-h-full object-contain'
                decoding='async'
                loading='lazy'
                src={thumbnailUrl}
              />
            </div>
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            overlayClassName='bg-black/70 backdrop-blur-xs'
            className='bg-transparent p-0 border-0 rounded-none w-screen h-screen'
          >
            <DialogClose className='flex justify-center items-center w-full h-full'>
              <img
                alt={record.alt}
                className='w-full max-w-[90vw] h-full max-h-[90vh] object-contain'
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
