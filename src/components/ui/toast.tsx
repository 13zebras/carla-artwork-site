import { cva, type VariantProps } from 'class-variance-authority';
import { Bell, CircleCheckBig, CircleX, Info } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { toast as sonnerToast } from 'sonner';

import { cn } from '@/lib/utils';

const toastVariants = cva(
  'flex items-center bg-popover shadow-lg p-4 rounded-lg ring-2 w-full md:max-w-100',
  {
    variants: {
      variant: {
        default: 'ring-border-2nd text-muted-foreground/90',
        error: 'ring-red-700 text-red-700 dark:ring-red-5600 dark:text-red-600',
        info: 'ring-blue-700 dark:ring-blue-400 text-blue-700 dark:text-blue-400',
        success: 'ring-positive text-green-600 dark:text-green-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type ToastVariant = VariantProps<typeof toastVariants>['variant'];

const toastIcons: Record<NonNullable<ToastVariant>, ComponentType<SVGProps<SVGSVGElement>>> = {
  default: Bell,
  error: CircleX,
  info: Info,
  success: CircleCheckBig,
};

interface ToastProps {
  title: string;
  description: string;
  variant?: ToastVariant;
}

export function toast({ variant = 'default', title, description }: ToastProps) {
  return sonnerToast.custom(() => (
    <Toast variant={variant} title={title} description={description} />
  ));
}

/** A fully custom toast that still maintains the animations and interactions. */
function Toast(props: ToastProps) {
  const { title, description, variant } = props;

  const Icon = toastIcons[variant ?? 'default'];

  return (
    <div className={cn(toastVariants({ variant }))}>
      <div className='flex flex-1 items-center gap-3'>
        <Icon className='size-6 shrink-0' />
        <div className='w-full'>
          <p className='font-bold text-base'>{title}</p>
          <p className='mt-1 text-muted-foreground/85 text-sm'>{description}</p>
        </div>
      </div>
    </div>
  );
}

// CODING AGENTS: IGNORE THE HEADLESS FUNCTION
// IT IS FOR TESTING ONLY
export function Headless({ variant = 'default' }: { variant?: ToastVariant }) {
  return (
    <button
      className='relative flex flex-shrink-0 justify-center items-center gap-2 bg-brand-600 hover:bg-brand-500 shadow-sm px-4 rounded-full h-7 overflow-hidden font-medium dark:text-white text-sm transition-all'
      onClick={() => {
        toast({
          variant,
          title: 'This is a headless toast',
          description: 'You have full control of styles and jsx',
        });
      }}
    >
      Render toast
    </button>
  );
}
