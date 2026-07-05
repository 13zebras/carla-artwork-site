import { useRouter } from '@tanstack/react-router';
import { useEffect, useMemo, useState, type SubmitEvent } from 'react';

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
import { updateArtwork } from '@/lib/artwork-upload.functions';
import type { ArtworkRecord } from '@/lib/artworks.server';
import { buildBunnyCdnUrl } from '@/lib/bunny';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';

type ArtworkEditModalProps = {
  record: ArtworkRecord | null;
  categories: ArtworkCategoryRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ArtworkEditModal({
  record,
  categories,
  open,
  onOpenChange,
}: ArtworkEditModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [alt, setAlt] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectableCategories = useMemo(() => {
    if (!record) {
      return categories.filter((category) => category.status === 'active');
    }

    const activeCategories = categories.filter((category) => category.status === 'active');
    if (activeCategories.some((category) => category.id === record.categoryId)) {
      return activeCategories;
    }

    return [
      ...activeCategories,
      {
        id: record.category.id,
        slug: record.category.slug,
        label: `${record.category.label} (current)`,
        description: null,
        sortOrder: Number.MAX_SAFE_INTEGER,
        status: 'active' as const,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    ];
  }, [categories, record]);

  useEffect(() => {
    if (!record || !open) {
      return;
    }

    setTitle(record.title);
    setCategoryId(record.categoryId);
    setStatus(record.status);
    setAlt(record.alt);
    setDescription(record.description ?? '');
    setSortOrder(String(record.sortOrder));
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [record, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) {
      return;
    }

    onOpenChange(nextOpen);
    if (!nextOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!record) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatedRecord = await updateArtwork({
        data: {
          id: record.id,
          title,
          categoryId,
          status,
          alt,
          description,
          sortOrder,
        },
      });

      await router.invalidate();
      setSuccessMessage(`Updated ${updatedRecord.title}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update artwork.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewUrl = record
    ? buildBunnyCdnUrl(record.cdnUrl, { width: 320, format: 'webp' })
    : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {record ? (
        <DialogContent className='max-w-2xl min-h-180 opacity-95 p-12 border-border-2nd'>
          <DialogHeader>
            <DialogTitle>Edit artwork</DialogTitle>
            <DialogDescription>
              Update database metadata. The Bunny file and storage path will not be changed.
            </DialogDescription>
          </DialogHeader>

          {errorMessage ? (
            <Alert variant='destructive'>
              <AlertTitle>Update failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {successMessage ? (
            <Alert>
              <AlertTitle>Artwork updated</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          ) : null}

          <section className='space-y-6'>
            <div className='space-y-4 rounded-lg border border-border bg-muted/10 p-4'>
              <div className='flex justify-center'>
                {previewUrl ? (
                  <img
                    alt={record.alt}
                    className='max-h-64 max-w-full object-contain'
                    decoding='async'
                    loading='lazy'
                    src={previewUrl}
                  />
                ) : null}
              </div>
              <div className='grid gap-1 text-sm'>
                <span className='text-muted-foreground'>Bunny storage path</span>
                <span className='break-all font-mono text-foreground'>{record.storagePath}</span>
              </div>
            </div>

            <form className='grid gap-6' onSubmit={handleSubmit}>
              <div className='grid gap-2'>
                <Label htmlFor='edit-title'>Title</Label>
                <Input
                  id='edit-title'
                  name='title'
                  type='text'
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='edit-category-id'>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id='edit-category-id'>
                    <SelectValue placeholder='Select a category' />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='edit-status'>Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(value === 'published' ? 'published' : 'draft')
                  }
                >
                  <SelectTrigger id='edit-status'>
                    <SelectValue placeholder='Select a status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='draft'>Draft</SelectItem>
                    <SelectItem value='published'>Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='edit-alt'>Alt text</Label>
                <Input
                  id='edit-alt'
                  name='alt'
                  type='text'
                  value={alt}
                  onChange={(event) => setAlt(event.target.value)}
                />
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='edit-description'>Description</Label>
                <Textarea
                  id='edit-description'
                  name='description'
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='edit-sort-order'>Sort order</Label>
                <Input
                  id='edit-sort-order'
                  name='sort_order'
                  type='number'
                  min='0'
                  step='1'
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                />
              </div>

              <div className='flex flex-wrap items-center gap-3'>
                <Button type='submit' disabled={isSubmitting || selectableCategories.length === 0}>
                  {isSubmitting ? 'Saving…' : 'Save changes'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  disabled={isSubmitting}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </section>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
