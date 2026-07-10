import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteAdminCategory } from '@/lib/categories.functions';
import type { ArtworkCategoryRecord } from '@/lib/categories.server';
import { cn } from '@/lib/utils';

type CategoryDeleteModalProps = {
  record: ArtworkCategoryRecord;
  onClose: () => void;
};

export function CategoryDeleteModal({ record, onClose }: CategoryDeleteModalProps) {
  const router = useRouter();
  const [isFinalConfirmation, setIsFinalConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function resetState() {
    setIsFinalConfirmation(false);
    setErrorMessage(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isDeleting) {
      return;
    }

    if (!nextOpen) {
      resetState();
      onClose();
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteAdminCategory({ data: { id: record.id } });
      await router.invalidate();
      onClose();
      toast.success('Category DELETED', {
        description: `${record.label}`,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Unable to delete category',
      );
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col justify-between gap-6 px-8 py-6 w-108 max-w-108 h-fit min-h-61 max-h-76',
          isFinalConfirmation && 'border border-destructive',
        )}
      >
        <DialogHeader>
          <DialogTitle className='mb-3 text-lg'>
            <p className='mb-2'>You are about to delete:</p>
            <p className='text-xl italic'>{record.label}</p>
          </DialogTitle>
          <DialogDescription
            className={cn('text-base', isFinalConfirmation && 'text-xl text-destructive font-bold')}
          >
            {isFinalConfirmation
              ? 'This action cannot be undone.'
              : 'This will permanently delete the category record from the database.'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className=''>
          <Button disabled={isDeleting} variant='outline' onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {isFinalConfirmation ? (
            <Button disabled={isDeleting} variant='destructive' onClick={handleDelete}>
              {isDeleting ? 'Deleting...' : "Yes I'm sure"}
            </Button>
          ) : (
            <Button
              disabled={isDeleting}
              variant='destructive'
              onClick={() => setIsFinalConfirmation(true)}
            >
              Delete
            </Button>
          )}
        </DialogFooter>
        {errorMessage && (
          <Alert variant='destructive' className=''>
            <AlertTitle>Delete failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
