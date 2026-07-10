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
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { createAdminCategory } from '@/lib/categories.functions';
import { slugify } from '@/lib/utils';

type AddCategoryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }
  return 'Unable to create category';
}

export function AddCategoryModal({ open, onOpenChange }: AddCategoryModalProps) {
  const router = useRouter();
  const [categoryPending, setCategoryPending] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryLabel, setCategoryLabel] = useState('');

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setCategoryLabel('');
      setCategoryError(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-140'>
        <DialogHeader>
          <DialogTitle>Add category</DialogTitle>
          <DialogDescription>
            Register a new category in the database and refresh the dashboard instantly.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-5'>
          <form
            className='space-y-4'
            onSubmit={async (event) => {
              event.preventDefault();
              setCategoryPending(true);
              setCategoryError(null);

              const form = event.currentTarget;

              try {
                const created = await createAdminCategory({ data: new FormData(form) });
                form.reset();
                setCategoryLabel('');

                await router.invalidate();
                toast({
                  variant: 'success',
                  title: `Created ${created.label}`,
                  description: `${created.id}`,
                });

                onOpenChange(false);
              } catch (error) {
                setCategoryError(getErrorMessage(error));
              } finally {
                setCategoryPending(false);
              }
            }}
          >
            <div className='space-y-2'>
              <Label htmlFor='category-label'>
                Category Name<span className='-ml-1 text-red-500'>*</span>
              </Label>
              <Input
                id='category-label'
                required
                name='label'
                maxLength={80}
                placeholder='Name used to identify the category'
                className='ph'
                value={categoryLabel}
                onChange={(event) => setCategoryLabel(event.target.value)}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='category-id'>Category ID - auto-generated - read-only</Label>
              <Input
                id='category-id'
                readOnly
                value={slugify(categoryLabel)}
                placeholder='auto-generated-from-name'
                className='border-neutral-300 dark:border-neutral-700 text-dim-fg/80 ph'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='category-description'>
                Description<span className='-ml-1 text-red-500'>*</span>
              </Label>
              <Textarea
                id='category-description'
                required
                name='description'
                placeholder='Description of the category to be used on the category page.'
                rows={8}
                className='border-border-2nd min-h-32 ph'
              />
            </div>

            <div className='space-y-2 max-w-20'>
              <Label htmlFor='category-sort-order'>
                Sort order<span className='-ml-1 text-red-500'>*</span>
              </Label>
              <Input
                id='category-sort-order'
                required
                name='sort_order'
                inputMode='numeric'
                placeholder='70'
                type='number'
                className='h-8 ph'
              />
            </div>

            <Button variant='brand' disabled={categoryPending} type='submit'>
              {categoryPending ? 'Creating...' : 'Create category'}
            </Button>
          </form>
          {categoryError && (
            <Alert variant='destructive'>
              <AlertTitle>Category creation failed</AlertTitle>
              <AlertDescription>{categoryError}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
