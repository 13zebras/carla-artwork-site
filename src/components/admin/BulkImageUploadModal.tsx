import { useRouter } from '@tanstack/react-router';
import { type SubmitEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  uploadBulkArtworks,
  type BulkArtworkUploadError,
  type BulkArtworkUploadResult,
} from '@/lib/artwork-upload.functions';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';

const sampleCsv = (
  <div className='flex flex-col gap-2'>
    <div>
      <span className='text-red-500'>filename,</span>
      <span className='text-green-500'>title,</span>
      <span className='text-yellow-500'>category_id,</span>
      <span className='text-sky-400'>status,</span>
      <span className='text-orange-500'>alt,</span>
      <span className='text-cyan-400'>description,</span>
      <span className='text-fuchsia-400'>sort_order</span>
    </div>
    <div>
      <span className='text-red-500'>blue-bird.png,</span>
      <span className='text-green-500'>Blue Bird,</span>
      <span className='text-yellow-500'>illustration,</span>
      <span className='text-sky-400'>draft,</span>
      <span className='text-orange-500'>image of blue bird,</span>
      <span className='text-teal-400'>Lorem ipsum dolor sit amet,</span>
      <span className='text-fuchsia-400'>20</span>
    </div>
  </div>
);

function ErrorTable({ errors }: { errors: BulkArtworkUploadError[] }) {
  return (
    <section className='space-y-6 bg-card shadow-sm mt-4 p-6 border-2 border-destructive/80 rounded-xl text-card-foreground'>
      <div className='space-y-1.25 text-destructive'>
        <h3 className='mb-4 font-semibold text-xl leading-none tracking-tight'>
          Validation errors
        </h3>
        <p className='text-base'>No files were uploaded because the CSV or image set is invalid.</p>
        <p className='text-base'>
          {errors.length} row{errors.length === 1 ? '' : 's'} need attention before anything can be
          uploaded.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Row</TableHead>
            <TableHead>Filename</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errors.map((error) => (
            <TableRow key={`${error.row}-${error.filename ?? 'all'}-${error.message}`}>
              <TableCell>
                <Badge variant='destructive'>{error.row === 0 ? 'File' : `Row ${error.row}`}</Badge>
              </TableCell>
              <TableCell className='font-mono text-xs'>{error.filename ?? '—'}</TableCell>
              <TableCell>{error.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

type BulkImageUploadModalProps = {
  categories: ArtworkCategoryRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BulkImageUploadModal({
  categories,
  open,
  onOpenChange,
}: BulkImageUploadModalProps) {
  const router = useRouter();
  const activeCategories = categories.filter((category) => category.status === 'active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<BulkArtworkUploadResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setResult(null);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await uploadBulkArtworks({ data: formData });
      if (response.ok) {
        await router.invalidate();
        toast.success('Bulk Upload Successful');
      }
      setResult(response);
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Bulk upload failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasValidationErrors = result?.ok === false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[92vw] max-w-6xl min-h-150'>
        <DialogHeader>
          <DialogTitle className='mb-3 font-semibold text-2xl'>
            Bulk Add Images to Database / Storage
          </DialogTitle>
          <DialogDescription className='mb-2 text-base'>
            <p className='pb-3'>Upload one CSV as well as the corresponding image files.</p>
            <p className='pb-1 font-bold text-red-500'>Required fields for CSV:</p>
            <ul className='flex flex-col flex-wrap gap-x-16 pl-7 max-w-fit max-h-24 font-mono leading-6 list-disc'>
              <li>filename: must match exactly</li>
              <li>title</li>
              <li>category_id</li>
              <li>status: published, draft</li>
              <li>alt text</li>
              <li>description: will display on artwork page</li>
              <li>sort order: a number &gt;= 0</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <form className='gap-7 grid' encType='multipart/form-data' onSubmit={handleSubmit}>
          <div className='gap-4 grid lg:grid-cols-2'>
            <div className='gap-3 grid'>
              <Label htmlFor='bulk-csv'>CSV file</Label>
              <Input
                id='bulk-csv'
                name='csv'
                type='file'
                accept='.csv,text/csv'
                required
                className='hover:file:bg-positive/80 active:file:bg-positive/70 file:bg-positive/60 file:mr-3 p-0 file:px-3 border-0 file:border-0 file:rounded-md file:cursor-pointer'
              />
            </div>
            <div className='gap-3 grid'>
              <Label htmlFor='bulk-files'>Image files</Label>
              <Input
                id='bulk-files'
                name='files'
                type='file'
                accept='image/jpeg,image/png,image/webp'
                multiple
                required
                className='file:mr-3 p-0 file:px-3 border-0 file:border-0 file:rounded-md hover:file:bg-accent-c/90 active:file:bg-accent-c/80 file:bg-accent-c/70 file:cursor-pointer'
              />
            </div>
          </div>

          <div className='gap-3 grid'>
            <div className='flex justify-between items-center gap-3'>
              <Label>Sample CSV (each row must be in the exact order shown)</Label>
            </div>
            <pre className='bg-muted/50 p-4 border border-border-2nd rounded-lg overflow-x-auto text-sm leading-6'>
              {sampleCsv}
            </pre>
            <p className='pl-3 text-muted-foreground text-sm italic'>
              tip: use a spreadsheet, export as a csv file
            </p>
          </div>

          <div className='gap-3 grid'>
            <div className='flex justify-start items-center gap-3'>
              <Label className='text-base'>Active categories to use in CSV</Label>
              <Badge variant='positive'>{activeCategories.length}</Badge>
            </div>
            {activeCategories.length > 0 ? (
              <ul className='flex flex-col flex-wrap gap-x-16 gap-y-2 pl-7 max-w-fit max-h-20 font-mono text-sm list-disc'>
                {activeCategories.map((category) => (
                  <li key={category.id}>{category.id}</li>
                ))}
              </ul>
            ) : (
              <Alert>
                <AlertTitle>No active categories</AlertTitle>
                <AlertDescription>
                  Add a category first so bulk rows can resolve category id or label values.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className='flex items-center gap-3'>
            <Button disabled={isSubmitting} type='submit' variant='brand'>
              {isSubmitting ? 'Uploading…' : 'Upload bulk images'}
            </Button>
            {isSubmitting ? (
              <p className='text-muted-foreground text-sm'>
                Validating the CSV and matching image files…
              </p>
            ) : null}
          </div>
        </form>

        {submitError ? (
          <Alert variant='destructive'>
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        {hasValidationErrors && result ? (
          <div className='max-h-[55vh] overflow-y-auto'>
            <ErrorTable errors={result.errors} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
