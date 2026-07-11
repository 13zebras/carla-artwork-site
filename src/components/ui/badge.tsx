import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'group/badge inline-flex justify-center items-center gap-1 px-2 py-0.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 border border-transparent aria-invalid:border-destructive focus-visible:border-ring rounded-full aria-invalid:ring-destructive/20 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:aria-invalid:ring-destructive/40 w-fit h-5 [&>svg]:size-3! overflow-hidden font-medium text-xs whitespace-nowrap transition-all [&>svg]:pointer-events-none shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gray-600 text-gray-100 border-border/60 dark:bg-gray-700 [a]:hover:bg-gray-600/90',
        secondary: 'bg-muted-foreground text-secondary-foreground [a]:hover:bg-secondary/90',
        info: 'bg-fuchsia-700 text-muted-foreground dark:bg-fuchsia-600/70 [a]:hover:bg-fuchsia-600/90',
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
