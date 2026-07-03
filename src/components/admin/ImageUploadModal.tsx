import { useRouter } from '@tanstack/react-router';
import { useState, type SubmitEvent } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { uploadSingleArtwork } from '@/lib/artwork-upload.functions';
import { buildBunnyCdnUrl } from '@/lib/bunny';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';

import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type UploadSuccess = {
  title: string;
  storagePath: string;
  cdnUrl: string;
};

type ImageUploadModalProps = {
  categories: ArtworkCategoryRecord[];
};

export function ImageUploadModal({ categories }: ImageUploadModalProps) {
  const router = useRouter();
  const activeCategories = categories.filter((category) => category.status === 'active');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadSuccess | null>(null);

  const previewUrl = success
    ? buildBunnyCdnUrl(success.cdnUrl, { width: 320, format: 'webp' })
    : null;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccess(null);

    if (!categoryId) {
      setErrorMessage('Choose a category before uploading.');
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('category_id', categoryId);
    formData.set('status', status);

    setIsSubmitting(true);

    try {
      const record = await uploadSingleArtwork({ data: formData });
      await router.invalidate();

      form.reset();
      setCategoryId('');
      setStatus('draft');
      setSuccess({
        title: record.title,
        storagePath: record.storagePath,
        cdnUrl: record.cdnUrl,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload artwork.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant='positive' className='w-32'>
              Upload Image
            </Button>
          </TooltipTrigger>
          <TooltipContent side='top'>Upload a single image</TooltipContent>
        </Tooltip>
      </DialogTrigger>
      <DialogContent className='min-h-180 opacity-95 p-12'>
        <DialogHeader>
          <DialogTitle>Single upload</DialogTitle>
          <DialogDescription>
            Upload one artwork and store its metadata in SQLite.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant='destructive'>
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {success && (
          <div className='space-y-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6'>
            <div className='space-y-1.5'>
              <h3 className='text-2xl font-semibold leading-none tracking-tight'>
                Upload successful
              </h3>
              <p className='text-sm text-muted-foreground'>{success.title}</p>
            </div>
            <dl className='grid gap-3 text-sm'>
              <div className='grid gap-1'>
                <dt className='text-muted-foreground'>Storage path</dt>
                <dd className='break-all font-mono text-foreground'>{success.storagePath}</dd>
              </div>
              <div className='grid gap-1'>
                <dt className='text-muted-foreground'>Optimized preview URL</dt>
                <dd className='break-all'>
                  <a
                    href={previewUrl ?? undefined}
                    rel='noreferrer'
                    target='_blank'
                    className='font-medium text-primary underline underline-offset-4'
                  >
                    {previewUrl}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        )}

        <section className='space-y-6'>
          <div className='space-y-1.5'>
            <h3 className='text-2xl font-semibold leading-none tracking-tight'>Artwork details</h3>
            <p className='text-sm text-muted-foreground'>
              {activeCategories.length > 0
                ? `${activeCategories.length} active categor${activeCategories.length === 1 ? 'y' : 'ies'} available.`
                : 'No active categories are available yet.'}
            </p>
          </div>

          {activeCategories.length === 0 ? (
            <Alert variant='destructive'>
              <AlertTitle>No active categories</AlertTitle>
              <AlertDescription>
                Add a category from the dashboard before uploading.
              </AlertDescription>
            </Alert>
          ) : null}

          <form className='grid gap-6' encType='multipart/form-data' onSubmit={handleSubmit}>
            <input type='hidden' name='category_id' value={categoryId} />
            <input type='hidden' name='status' value={status} />

            <div className='grid gap-2'>
              <Label htmlFor='file'>File</Label>
              <Input
                id='file'
                name='file'
                type='file'
                accept='image/jpeg,image/png,image/webp'
                required
                className='p-0 border-0 file:cursor-pointer file:border-0 file:bg-accent-c/80 hover:file:bg-accent-c active:file:bg-accent-c/70  file:text-sm file:rounded-md file:px-3 file:mr-3'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='title'>Title</Label>
              <Input id='title' name='title' type='text' placeholder='Blue Bird' required />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='category_id'>Category</Label>
              <Select
                value={categoryId}
                onValueChange={setCategoryId}
                disabled={activeCategories.length === 0}
              >
                <SelectTrigger id='category_id'>
                  <SelectValue placeholder='Select a category' />
                </SelectTrigger>
                <SelectContent>
                  {activeCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='status'>Status</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value === 'published' ? 'published' : 'draft')}
              >
                <SelectTrigger id='status'>
                  <SelectValue placeholder='Select a status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='draft'>Draft</SelectItem>
                  <SelectItem value='published'>Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='alt'>Alt text</Label>
              <Input id='alt' name='alt' type='text' placeholder='Blue bird illustration' />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                name='description'
                placeholder='Short artwork description'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='sort_order'>Sort order</Label>
              <Input
                id='sort_order'
                name='sort_order'
                type='number'
                min='0'
                step='1'
                defaultValue='0'
              />
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <Button type='submit' disabled={isSubmitting || activeCategories.length === 0}>
                {isSubmitting ? 'Uploading…' : 'Upload artwork'}
              </Button>
            </div>
          </form>
        </section>
      </DialogContent>
    </Dialog>
  );
}
