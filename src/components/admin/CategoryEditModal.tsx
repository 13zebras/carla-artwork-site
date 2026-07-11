import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

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
import { toast } from '@/components/ui/toast';
import { updateAdminCategory } from '@/lib/functions/categories.functions';
import type { ArtworkCategoryRecord } from '@/lib/shared/categories.types';

type CategoryEditModalProps = {
  record: ArtworkCategoryRecord;
  onClose: () => void;
};

type CategoryEditForm = {
  label: string;
  description: string;
  sortOrder: string;
  status: 'active' | 'archived';
};

function createCategoryEditForm(record: ArtworkCategoryRecord): CategoryEditForm {
  return {
    label: record.label,
    description: record.description ?? '',
    sortOrder: String(record.sortOrder),
    status: record.status,
  };
}

export function CategoryEditModal({ record, onClose }: CategoryEditModalProps) {
  const router = useRouter();
  const [form, setForm] = useState(() => createCategoryEditForm(record));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateField<K extends keyof CategoryEditForm>(field: K, value: CategoryEditForm[K]) {
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedLabel = form.label.trim();
    const trimmedDescription = form.description.trim();
    const trimmedSortOrder = form.sortOrder.trim();

    if (!trimmedLabel || !trimmedDescription || !trimmedSortOrder) {
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
      const data = new FormData();
      data.append('id', record.id);
      data.append('label', trimmedLabel);
      data.append('description', trimmedDescription);
      data.append('sort_order', trimmedSortOrder);
      data.append('status', form.status);

      const updated = await updateAdminCategory({ data });

      await router.invalidate();
      toast({
        variant: 'success',
        title: `Updated ${updated.label}`,
        description: `${updated.id}`,
      });
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Unable to update category.',
      );
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className='pb-8 max-w-140'>
        <DialogHeader>
          <DialogTitle className='font-semibold text-2xl'>Edit category</DialogTitle>
          <DialogDescription>
            Update the category details. The category ID cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-5 mt-2'>
          <form className='space-y-5 pb-2' onSubmit={handleSubmit}>
            <div className='space-y-3'>
              <Label htmlFor='edit-category-label'>
                Category Name<span className='-ml-1 text-red-500'>*</span>
              </Label>
              <Input
                id='edit-category-label'
                required
                maxLength={80}
                placeholder='Name used to identify the category'
                className='ph'
                value={form.label}
                onChange={(event) => updateField('label', event.target.value)}
              />
            </div>

            <div className='space-y-3'>
              <Label htmlFor='edit-category-description'>
                Description<span className='-ml-1 text-red-500'>*</span>
              </Label>
              <Textarea
                id='edit-category-description'
                required
                placeholder='Description of the category to be used on the category page.'
                rows={8}
                className='border-border-2nd min-h-32 ph'
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
              />
            </div>

            <div className='flex items-start gap-10'>
              <div className='space-y-3 max-w-21'>
                <Label htmlFor='edit-category-sort-order'>
                  Sort order<span className='-ml-1 text-red-500'>*</span>
                </Label>
                <Input
                  id='edit-category-sort-order'
                  required
                  inputMode='numeric'
                  placeholder='70'
                  type='number'
                  min='0'
                  className='h-8 ph'
                  value={form.sortOrder}
                  onChange={(event) => updateField('sortOrder', event.target.value)}
                />
              </div>

              <div className='space-y-3'>
                <Label htmlFor='edit-category-status'>
                  Status<span className='-ml-1 text-red-500'>*</span>
                </Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    updateField('status', value === 'archived' ? 'archived' : 'active')
                  }
                >
                  <SelectTrigger id='edit-category-status' className='w-30'>
                    <SelectValue placeholder='Select a status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='active'>Active</SelectItem>
                    <SelectItem value='archived'>Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-3'>
                <Label htmlFor='edit-category-id'>Category ID</Label>
                <div className='flex flex-row items-center gap-3 h-fit'>
                  <Input
                    id='edit-category-id'
                    readOnly
                    value={record.id}
                    placeholder='auto-generated-from-name'
                    className='border-border/80 w-24 text-fg ph'
                    disabled
                  />
                  <span className='text-muted-foreground/70 text-xs italic'>read-only</span>
                </div>
              </div>
            </div>

            <Button variant='brand' disabled={isSubmitting} type='submit'>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
          {errorMessage && (
            <Alert variant='destructive'>
              <AlertTitle>Category update failed</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
