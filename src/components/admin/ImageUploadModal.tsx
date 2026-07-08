import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { useRouter } from '@tanstack/react-router';
import { useState, type ReactNode, type SubmitEvent } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { registerExistingArtwork, uploadSingleArtwork } from '@/lib/artwork-upload.functions';
import type { ArtworkRecord } from '@/lib/artworks.server';
import type { BunnyStorageFile } from '@/lib/bunny.server';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';

type ImageUploadModalProps = {
  categories: ArtworkCategoryRecord[];
  untrackedFiles?: BunnyStorageFile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const statusItems = {
  draft: 'Draft',
  published: 'Published',
};

function getSubmitLabel(isSubmitting: boolean, mode: 'upload' | 'link') {
  if (isSubmitting) {
    if (mode === 'link') {
      return 'Linking…';
    }

    return 'Uploading…';
  }

  if (mode === 'link') {
    return 'Link artwork';
  }

  return 'Upload artwork';
}

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <div className='flex items-center gap-2'>
      <Label htmlFor={htmlFor}>{children}</Label>
      <Field.Error
        match='valueMissing'
        render={<span />}
        className='font-medium text-destructive text-xs'
      >
        Required
      </Field.Error>
    </div>
  );
}

export function ImageUploadModal({
  categories,
  untrackedFiles = [],
  open,
  onOpenChange,
}: ImageUploadModalProps) {
  const router = useRouter();

  const [mode, setMode] = useState<'upload' | 'link'>('upload');
  const [categoryId, setCategoryId] = useState('');
  const [storagePath, setStoragePath] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeCategories = categories.filter((category) => category.status === 'active');
  const categoryItems = Object.fromEntries(
    activeCategories.map((category) => [category.id, category.label]),
  );

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('category_id', categoryId);
    formData.set('status', status);

    setIsSubmitting(true);

    let record: ArtworkRecord;

    try {
      if (mode === 'link') {
        record = await registerExistingArtwork({
          data: {
            storagePath,
            title: String(formData.get('title') ?? ''),
            categoryId,
            alt: String(formData.get('alt') ?? '').trim(),
            description: String(formData.get('description') ?? '').trim(),
            sortOrder: Number(formData.get('sort_order') ?? 0),
            status,
          },
        });
      } else {
        record = await uploadSingleArtwork({ data: formData });
      }

      await router.invalidate();

      toast.success('Artwork added', {
        description: `“${record.title}” — ${record.originalFilename}`,
      });

      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to upload artwork.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setMode('upload');
      setCategoryId('');
      setStoragePath('');
      setStatus('draft');
      setErrorMessage(null);
    }

    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='bg-background-2nd opacity-95 p-12 border-border-2nd max-w-2xl min-h-180'>
        <DialogHeader>
          <DialogTitle className='font-semibold text-2xl'>Add Single Image to Database</DialogTitle>
          <DialogDescription>All fields are required</DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant='destructive'>
            <AlertTitle>Upload failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <section className='space-y-6'>
          {activeCategories.length === 0 ? (
            <Alert variant='destructive'>
              <AlertTitle className='font-semibold text-lg'>No active categories</AlertTitle>
              <AlertDescription>
                Add a category from the dashboard before adding images.
              </AlertDescription>
            </Alert>
          ) : null}

          <Form className='gap-6 grid mt-3' encType='multipart/form-data' onSubmit={handleSubmit}>
            <div className='gap-3 grid'>
              <Label>Image Source</Label>
              <div className='flex gap-6'>
                <div className='flex items-center gap-2'>
                  <input
                    type='radio'
                    id='source-upload'
                    name='source-mode'
                    value='upload'
                    checked={mode === 'upload'}
                    onChange={() => setMode('upload')}
                    aria-label='Upload new file'
                    className='size-4 accent-brand-500 cursor-pointer'
                  />
                  <Label htmlFor='source-upload' className='font-normal cursor-pointer'>
                    Upload new file
                  </Label>
                </div>
                <div className='flex items-center gap-2'>
                  <input
                    type='radio'
                    id='source-link'
                    name='source-mode'
                    value='link'
                    checked={mode === 'link'}
                    onChange={() => setMode('link')}
                    disabled={untrackedFiles.length === 0}
                    aria-label='Link existing Bunny image'
                    className='size-4 accent-brand-500 cursor-pointer disabled:cursor-not-allowed'
                  />
                  <Label
                    htmlFor='source-link'
                    className={
                      untrackedFiles.length === 0
                        ? 'cursor-not-allowed font-normal text-muted-foreground/60'
                        : 'cursor-pointer font-normal'
                    }
                  >
                    Link existing Bunny image
                  </Label>
                </div>
              </div>
            </div>

            {mode === 'upload' ? (
              <Field.Root name='file' className='gap-3 grid'>
                <RequiredLabel htmlFor='file'>Image file</RequiredLabel>
                <Field.Control
                  render={<Input />}
                  id='file'
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  required
                  className='aria-invalid:hover:file:bg-destructive/80 aria-invalid:active:file:bg-destructive/60 aria-invalid:file:bg-destructive/65 file:mr-3 p-0 file:px-3 border-0 file:border-0 file:rounded-md hover:file:bg-accent-c active:file:bg-accent-c/70 file:bg-accent-c/80 file:cursor-pointer'
                />
              </Field.Root>
            ) : (
              <Field.Root name='storage_path' className='gap-3 grid'>
                <RequiredLabel htmlFor='storage_path'>Existing Bunny image</RequiredLabel>
                <Select
                  name='storage_path'
                  required
                  value={storagePath}
                  onValueChange={setStoragePath}
                >
                  <SelectTrigger id='storage_path' className='min-w-94'>
                    <SelectValue
                      placeholder='Select an image stored in Bunny but not in database'
                      className='ph'
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {untrackedFiles.map((file) => (
                      <SelectItem key={file.path} value={file.path}>
                        {file.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field.Root>
            )}

            <Field.Root name='title' className='gap-3 grid'>
              <RequiredLabel htmlFor='title'>Title</RequiredLabel>
              <Field.Control
                render={<Input />}
                id='title'
                type='text'
                placeholder='Image title'
                required
                className='ph'
              />
            </Field.Root>

            <Field.Root name='category_id' className='gap-3 grid'>
              <RequiredLabel htmlFor='category_id'>Category</RequiredLabel>
              <Select
                name='category_id'
                required
                items={categoryItems}
                value={categoryId}
                onValueChange={setCategoryId}
                disabled={activeCategories.length === 0}
              >
                <SelectTrigger id='category_id' className='min-w-44'>
                  <SelectValue placeholder='Select a category' className='ph' />
                </SelectTrigger>
                <SelectContent>
                  {activeCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field.Root>

            <Field.Root name='status' className='gap-3 grid'>
              <RequiredLabel htmlFor='status'>Status</RequiredLabel>
              <Select
                name='status'
                required
                items={statusItems}
                value={status}
                onValueChange={setStatus}
              >
                <SelectTrigger id='status' className='min-w-44'>
                  <SelectValue placeholder='Select a status' className='ph' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='draft'>Draft</SelectItem>
                  <SelectItem value='published'>Published</SelectItem>
                </SelectContent>
              </Select>
            </Field.Root>

            <Field.Root name='alt' className='gap-3 grid'>
              <RequiredLabel htmlFor='alt'>Alt text</RequiredLabel>
              <Field.Control
                render={<Input />}
                id='alt'
                type='text'
                placeholder='Alt text for image'
                required
                className='ph'
              />
            </Field.Root>

            <Field.Root name='description' className='gap-3 grid'>
              <RequiredLabel htmlFor='description'>Image description</RequiredLabel>
              <Field.Control
                render={<Textarea />}
                id='description'
                placeholder='Artwork description displayed on page'
                className='ph'
                required
              />
            </Field.Root>

            <Field.Root name='sort_order' className='gap-3 grid'>
              <RequiredLabel htmlFor='sort_order'>Sort order</RequiredLabel>
              <div className='flex flex-row items-center gap-3'>
                <Field.Control
                  render={<Input />}
                  id='sort_order'
                  type='number'
                  min='0'
                  step='1'
                  defaultValue='0'
                  placeholder='Numbers only'
                  className='w-24 ph'
                  required
                />
                <span className='text-muted-foreground text-xs italic'>
                  Lower numbers appear higher up on pages.
                </span>
              </div>
            </Field.Root>
            <div className='flex flex-wrap items-center gap-3'>
              <Button
                type='submit'
                variant='positive'
                disabled={isSubmitting || activeCategories.length === 0}
                className='rounded-lg'
              >
                {getSubmitLabel(isSubmitting, mode)}
              </Button>
            </div>
          </Form>
        </section>
      </DialogContent>
    </Dialog>
  );
}
