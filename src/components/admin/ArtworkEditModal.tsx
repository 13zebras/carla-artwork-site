import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { useRouter } from '@tanstack/react-router';
import { useMemo, useState, type ReactNode, type SubmitEvent } from 'react';
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
import { updateArtwork } from '@/lib/functions/artwork-upload.functions';
import type { ArtworkRecord } from '@/lib/shared/artworks.types';
import { buildBunnyCdnUrl } from '@/lib/shared/bunny';
import type { ArtworkCategoryRecord } from '@/lib/shared/categories.types';

type ArtworkEditModalProps = {
  record: ArtworkRecord;
  activeCategories: ArtworkCategoryRecord[];
  onClose: () => void;
};

const statusItems = {
  draft: 'Draft',
  published: 'Published',
};

type ArtworkEditForm = {
  title: string;
  categoryId: string;
  status: 'draft' | 'published';
  alt: string;
  description: string;
  sortOrder: string;
};

function createArtworkEditForm(record: ArtworkRecord): ArtworkEditForm {
  return {
    title: record.title,
    categoryId: record.categoryId,
    status: record.status,
    alt: record.alt,
    description: record.description ?? '',
    sortOrder: String(record.sortOrder),
  };
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

export function ArtworkEditModal({ record, activeCategories, onClose }: ArtworkEditModalProps) {
  const router = useRouter();
  const [form, setForm] = useState(() => createArtworkEditForm(record));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectableCategories = useMemo(() => {
    if (activeCategories.some((category) => category.id === record.categoryId)) {
      return activeCategories;
    }

    return [
      ...activeCategories,
      {
        id: record.category.id,
        label: `${record.category.label} (current)`,
        description: null,
        sortOrder: Number.MAX_SAFE_INTEGER,
        status: 'active' as const,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    ];
  }, [activeCategories, record]);

  const categoryItems = useMemo(
    () => Object.fromEntries(selectableCategories.map((category) => [category.id, category.label])),
    [selectableCategories],
  );

  const canSubmit = !isSubmitting && selectableCategories.length > 0;

  function updateField<K extends keyof ArtworkEditForm>(field: K, value: ArtworkEditForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isSubmitting) {
      return;
    }

    if (!nextOpen) {
      setErrorMessage(null);
      onClose();
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedTitle = form.title.trim();
    const trimmedAlt = form.alt.trim();
    const trimmedDescription = form.description.trim();
    const trimmedSortOrder = form.sortOrder.trim();

    if (
      !trimmedTitle ||
      !form.categoryId ||
      !form.status ||
      !trimmedAlt ||
      !trimmedDescription ||
      !trimmedSortOrder
    ) {
      setErrorMessage('Complete all required fields.');
      return;
    }

    const sortOrderValue = Number(trimmedSortOrder);
    if (!Number.isInteger(sortOrderValue) || sortOrderValue < 0) {
      setErrorMessage('Sort order must be a non-negative whole number.');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateArtwork({
        data: {
          id: record.id,
          ...form,
          title: trimmedTitle,
          alt: trimmedAlt,
          description: trimmedDescription,
          sortOrder: trimmedSortOrder,
        },
      });

      await router.invalidate();
      toast.success('Artwork updated', {
        description: trimmedTitle,
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update artwork.');
      setIsSubmitting(false);
    }
  }

  const previewUrl = buildBunnyCdnUrl(record.cdnUrl, {
    width: 120,
    height: 120,
    format: 'webp',
  });

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className='opacity-95 p-12 border-border-2nd max-w-2xl min-h-180'>
        <DialogHeader>
          <DialogTitle className='font-semibold text-2xl'>Edit artwork</DialogTitle>
          <DialogDescription>
            Update database metadata. The image file and storage path cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <section className='space-y-6'>
          <div className='flex gap-6 p-4 border border-border-2nd rounded-lg'>
            <div className='flex justify-center w-30 h-30'>
              {previewUrl ? (
                <img
                  alt={record.alt}
                  className='max-w-full max-h-30 object-contain'
                  decoding='async'
                  loading='lazy'
                  src={previewUrl}
                />
              ) : null}
            </div>
            <div className='flex flex-col justify-center gap-3 text-sm'>
              <span className='text-muted-foreground text-lg'>Bunny storage path:</span>
              <span className='font-mono text-foreground break-all'>{record.storagePath}</span>
            </div>
          </div>

          <Form className='gap-6 grid' onSubmit={handleSubmit}>
            <Field.Root name='title' className='gap-2 grid'>
              <RequiredLabel htmlFor='edit-title'>Title</RequiredLabel>
              <Field.Control
                render={<Input />}
                id='edit-title'
                type='text'
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                required
              />
            </Field.Root>

            <Field.Root name='category_id' className='gap-2 grid'>
              <RequiredLabel htmlFor='edit-category-id'>Category</RequiredLabel>
              <Select
                name='category_id'
                required
                items={categoryItems}
                value={form.categoryId}
                onValueChange={(value) => updateField('categoryId', value)}
              >
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
            </Field.Root>

            <Field.Root name='status' className='gap-2 grid'>
              <RequiredLabel htmlFor='edit-status'>Status</RequiredLabel>
              <Select
                name='status'
                required
                items={statusItems}
                value={form.status}
                onValueChange={(value) =>
                  updateField('status', value === 'published' ? 'published' : 'draft')
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
            </Field.Root>

            <Field.Root name='alt' className='gap-2 grid'>
              <RequiredLabel htmlFor='edit-alt'>Alt text</RequiredLabel>
              <Field.Control
                render={<Input />}
                id='edit-alt'
                type='text'
                value={form.alt}
                onChange={(event) => updateField('alt', event.target.value)}
                required
              />
            </Field.Root>

            <Field.Root name='description' className='gap-2 grid'>
              <RequiredLabel htmlFor='edit-description'>Description</RequiredLabel>
              <Field.Control
                render={<Textarea />}
                id='edit-description'
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                required
              />
            </Field.Root>

            <Field.Root name='sort_order' className='gap-2 grid'>
              <RequiredLabel htmlFor='edit-sort-order'>Sort order</RequiredLabel>
              <Field.Control
                render={<Input />}
                id='edit-sort-order'
                type='number'
                min='0'
                step='1'
                value={form.sortOrder}
                onChange={(event) => updateField('sortOrder', event.target.value)}
                required
              />
            </Field.Root>

            <div className='flex flex-wrap items-center gap-3'>
              <Button variant='positive' type='submit' disabled={!canSubmit}>
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
          </Form>
        </section>
        {errorMessage && (
          <Alert variant='destructive' className='bg-background mt-2'>
            <AlertTitle>Update failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
