import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shared/utils';

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot='dialog' {...props} />;
}

function DialogTrigger({
  asChild = false,
  children,
  render,
  nativeButton,
  ...props
}: DialogPrimitive.Trigger.Props & {
  asChild?: boolean;
}) {
  const child = asChild && React.isValidElement(children) ? children : undefined;

  return (
    <DialogPrimitive.Trigger
      data-slot='dialog-trigger'
      render={render ?? child}
      nativeButton={nativeButton ?? (child ? false : undefined)}
      {...props}
    >
      {child ? undefined : children}
    </DialogPrimitive.Trigger>
  );
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot='dialog-portal' {...props} />;
}

function DialogClose({
  asChild = false,
  children,
  render,
  nativeButton,
  ...props
}: DialogPrimitive.Close.Props & {
  asChild?: boolean;
}) {
  const child = asChild && React.isValidElement(children) ? children : undefined;

  return (
    <DialogPrimitive.Close
      data-slot='dialog-close'
      render={render ?? child}
      nativeButton={nativeButton ?? (child ? false : undefined)}
      {...props}
    >
      {child ? undefined : children}
    </DialogPrimitive.Close>
  );
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot='dialog-overlay'
      className={cn(
        'z-50 isolate fixed inset-0 bg-black/50 data-closed:animate-out data-open:animate-in data-open:fade-in-0 data-closed:fade-out-0',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  overlayClassName,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
  overlayClassName?: string;
}) {
  return (
    <DialogPortal>
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Popup
        data-slot='dialog-content'
        className={cn(
          'top-1/2 left-1/2 z-50 fixed gap-4 grid bg-background-2nd shadow-lg p-10 border border-border-2nd rounded-lg outline-none w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 data-closed:animate-out data-open:animate-in duration-200 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot='dialog-close'
            className="absolute top-4 right-4 rounded-full opacity-80 ring-offset-background transition-all hover:opacity-100 hover:scale-120 hover:bg-accent-2 focus:ring-2 focus:ring-ring focus:ring-offset-3 focus:outline-hidden disabled:pointer-events-none data-open:bg-accent data-open:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5"
          >
            <XIcon className='size-5' />
            <span className='sr-only'>Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-header'
      className={cn('flex flex-col gap-2 sm:text-left text-center', className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot='dialog-footer'
      className={cn('flex sm:flex-row flex-col-reverse sm:justify-end gap-2', className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant='outline' />}>Close</DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot='dialog-title'
      className={cn('font-semibold text-lg leading-none', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot='dialog-description'
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
