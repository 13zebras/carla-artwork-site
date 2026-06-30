import { Link, createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { listAdminCategories } from '@/lib/categories.functions';

type UploadSuccess = {
  title: string;
  storagePath: string;
  cdnUrl: string;
};

export const Route = createFileRoute('/admin/upload')({
  loader: async () => {
    const categories = await listAdminCategories();

    return {
      categories: categories.filter((category) => category.status === 'active'),
    };
  },
  component: AdminUploadRoute,
});

function AdminUploadRoute() {
  const { categories } = Route.useLoaderData();
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<UploadSuccess | null>(null);

  const previewUrl = success
    ? buildBunnyCdnUrl(success.cdnUrl, { width: 320, format: 'webp' })
    : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-6'>
      <Card>
        <CardHeader>
          <CardTitle>Single upload</CardTitle>
          <CardDescription>Upload one artwork and store its metadata in SQLite.</CardDescription>
        </CardHeader>
      </Card>

      {errorMessage ? (
        <Alert variant='destructive'>
          <AlertTitle>Upload failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {success ? (
        <Card className='border-emerald-500/30 bg-emerald-500/5'>
          <CardHeader>
            <CardTitle>Upload successful</CardTitle>
            <CardDescription>{success.title}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
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
            <Button asChild>
              <Link to='/admin'>Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Artwork details</CardTitle>
          <CardDescription>
            {categories.length > 0
              ? `${categories.length} active categor${categories.length === 1 ? 'y' : 'ies'} available.`
              : 'No active categories are available yet.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <Alert variant='destructive' className='mb-6'>
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
                disabled={categories.length === 0}
              >
                <SelectTrigger id='category_id'>
                  <SelectValue placeholder='Select a category' />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
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
              <Button type='submit' disabled={isSubmitting || categories.length === 0}>
                {isSubmitting ? 'Uploading…' : 'Upload artwork'}
              </Button>
              <Button asChild variant='outline'>
                <Link to='/admin'>Back to dashboard</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
