import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';

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
import { deleteArtwork } from '@/lib/artwork-upload.functions';
import type { ArtworkRecord } from '@/lib/artworks.server';

type ArtworkDeleteModalProps = {
  record: ArtworkRecord;
  onClose: () => void;
};

export function ArtworkDeleteModal({ record, onClose }: ArtworkDeleteModalProps) {
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
      await deleteArtwork({ data: { id: record.id } });
      await router.invalidate();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Unable to delete artwork',
      );
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className='w-[420px] max-w-[420px]'>
        <DialogHeader>
          <DialogTitle>
            {isFinalConfirmation ? 'Are you sure you want to delete?' : `Delete "${record.title}"?`}
          </DialogTitle>
          <DialogDescription>
            {isFinalConfirmation
              ? 'This will permanently delete the database record and remove the image from Bunny Storage.'
              : 'This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <Alert variant='destructive'>
            <AlertTitle>Delete failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
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
      </DialogContent>
    </Dialog>
  );
}
