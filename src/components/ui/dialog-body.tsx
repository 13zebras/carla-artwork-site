import * as React from 'react';

import { cn } from '@/lib/shared/utils';

/**
 * Scrollable body region for a Dialog. Custom addition — not part of the
 * shadcn/ui Dialog, so it lives in its own file to survive registry updates.
 *
 * Usage: give the DialogHeader `px-10 pt-10` and place everything below it in
 * DialogBody. The body spans the full popup width, so its scrollbar stays
 * flush with the right edge while content keeps the standard padding.
 */
function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-body'
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain px-10 pb-10 scrollbar-gutter:stable',
        className,
      )}
      {...props}
    />
  );
}

export { DialogBody };
