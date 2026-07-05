import { useRouter } from '@tanstack/react-router';
import { type SubmitEvent, useState } from 'react';

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
import type { ArtworkRecord } from '@/lib/artworks.server';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';

const sampleCsv = `filename,title,category,alt,description,slug,sort_order,status
blue-bird.jpg,Blue Bird,illustration,Blue bird illustration,,blue-bird,0,draft`;

function ErrorTable({ errors }: { errors: BulkArtworkUploadError[] }) {
  return (
    <section className='space-y-6 rounded-xl border bg-card p-6 text-card-foreground shadow-sm'>
      <div className='space-y-1.5'>
        <h3 className='text-2xl font-semibold leading-none tracking-tight'>Validation errors</h3>
        <p className='text-sm text-muted-foreground'>
          No files were uploaded because the CSV or image set is invalid.
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
                <Badge variant='outline'>{error.row === 0 ? 'File' : `Row ${error.row}`}</Badge>
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

function RecordsTable({ records }: { records: ArtworkRecord[] }) {
  return (
    <section className='space-y-6 rounded-xl border bg-card p-6 text-card-foreground shadow-sm'>
      <div className='space-y-1.5'>
        <h3 className='text-2xl font-semibold leading-none tracking-tight'>Created records</h3>
        <p className='text-sm text-muted-foreground'>SQLite rows created by this bulk upload.</p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dimensions</TableHead>
            <TableHead>Filename</TableHead>
            <TableHead>Storage path</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className='font-medium'>{record.title}</TableCell>
              <TableCell>
                <Badge variant='secondary'>{record.category.label}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={record.status === 'published' ? 'default' : 'outline'}>
                  {record.status}
                </Badge>
              </TableCell>
              <TableCell>
                {record.width} × {record.height}
              </TableCell>
              <TableCell className='max-w-40 truncate text-xs text-muted-foreground'>
                {record.originalFilename}
              </TableCell>
              <TableCell className='max-w-64 break-all font-mono text-xs text-muted-foreground'>
                {record.storagePath}
              </TableCell>
              <TableCell className='text-xs text-muted-foreground'>{record.createdAt}</TableCell>
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
      }
      setResult(response);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Bulk upload failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasValidationErrors = result?.ok === false;
  const hasSuccess = result?.ok === true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='min-h-150'>
        <DialogHeader>
          <DialogTitle>Bulk upload artworks</DialogTitle>
          <DialogDescription>
            Upload one CSV plus matching image files. The CSV must include filename,title,category.
            Category values may use a category id, slug, or label.
          </DialogDescription>
        </DialogHeader>

        <form className='grid gap-6' encType='multipart/form-data' onSubmit={handleSubmit}>
          <div className='grid gap-4 lg:grid-cols-2'>
            <div className='grid gap-2'>
              <Label htmlFor='bulk-csv'>CSV file</Label>
              <Input id='bulk-csv' name='csv' type='file' accept='.csv,text/csv' required />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='bulk-files'>Image files</Label>
              <Input
                id='bulk-files'
                name='files'
                type='file'
                accept='image/jpeg,image/png,image/webp'
                multiple
                required
              />
            </div>
          </div>

          <div className='grid gap-3'>
            <div className='flex items-center justify-between gap-3'>
              <Label>Sample CSV</Label>
              <Badge variant='outline'>Required</Badge>
            </div>
            <pre className='overflow-x-auto rounded-lg border bg-muted/50 p-4 text-sm leading-6'>
              {sampleCsv}
            </pre>
          </div>

          <div className='grid gap-3'>
            <div className='flex items-center justify-between gap-3'>
              <Label>Active categories</Label>
              <Badge variant='secondary'>{activeCategories.length}</Badge>
            </div>
            {activeCategories.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {activeCategories.map((category) => (
                  <Badge key={category.id} variant='outline'>
                    {category.label}
                  </Badge>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertTitle>No active categories</AlertTitle>
                <AlertDescription>
                  Add a category first so bulk rows can resolve category id, slug, or label values.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className='flex items-center gap-3'>
            <Button disabled={isSubmitting} type='submit'>
              {isSubmitting ? 'Uploading…' : 'Upload bulk artworks'}
            </Button>
            {isSubmitting ? (
              <p className='text-sm text-muted-foreground'>
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
          <Alert variant='destructive'>
            <AlertTitle>Validation failed</AlertTitle>
            <AlertDescription>
              {result.errors.length} row{result.errors.length === 1 ? '' : 's'} need attention
              before anything can be uploaded.
            </AlertDescription>
          </Alert>
        ) : null}

        {hasValidationErrors && result ? <ErrorTable errors={result.errors} /> : null}

        {hasSuccess && result ? (
          <div className='grid gap-6'>
            <Alert>
              <AlertTitle>Upload complete</AlertTitle>
              <AlertDescription>
                Inserted <strong>{result.insertedCount}</strong> artwork
                {result.insertedCount === 1 ? '' : 's'}.
              </AlertDescription>
            </Alert>
            <RecordsTable records={result.records} />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
