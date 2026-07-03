import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import type { ArtworkRecord } from '@/lib/artworks.server';
import { buildBunnyCdnUrl } from '@/lib/bunny';
import { dateFormatter } from '@/lib/utils';

type ArtworkInfoModalProps = {
  record: ArtworkRecord;
};

export function ArtworkInfoModal({ record }: ArtworkInfoModalProps) {
  const thumbnailUrl = buildBunnyCdnUrl(record.cdnUrl, {
    width: 300,
    height: 300,
    format: 'webp',
  });

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
    <Dialog>
      <DialogTrigger asChild>
        <button className='admin-button admin-info-button'>More...</button>
      </DialogTrigger>
      <DialogContent className='md:max-w-150 p-10 bg-secondary-background border-border-secondary'>
        <DialogHeader>
          <DialogTitle className='text-xl font-semibold'>{record.title} - Details</DialogTitle>
        </DialogHeader>
        <Table className=''>
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
        <div className='flex justify-center pt-2'>
          <img
            alt={record.alt}
            className='max-h-[300px] max-w-[300px] object-contain'
            decoding='async'
            loading='lazy'
            src={thumbnailUrl}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
