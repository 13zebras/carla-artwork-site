import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-gray-600 text-gray-100 border-border/60 dark:bg-gray-700 [a]:hover:bg-gray-600/90',
        secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/90',
        info: 'bg-indigo-600 text-white dark:bg-indigo-500/60 [a]:hover:bg-indigo-600/90',
        destructive:
          'bg-destructive text-white dark:bg-destructive/60 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/90',
        positive: 'bg-positive text-white dark:bg-positive/60 [a]:hover:bg-positive/90',
        outline:
          'border-border/60 text-foreground [a]:hover:bg-accent [a]:hover:text-accent-foreground',
        ghost: '[a]:hover:bg-accent [a]:hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 [a]:hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  children,
  render,
  ...props
}: useRender.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
  }) {
  const child = asChild && React.isValidElement(children) ? children : undefined;

  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
        children: child ? undefined : children,
      },
      props,
    ),
    render: render ?? child,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, badgeVariants };
