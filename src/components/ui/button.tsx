import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button cursor-pointer inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive border-destructive text-foreground hover:bg-destructive/80 active:bg-destructive/70 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        information:
          'bg-information text-neutral-50 border-information hover:bg-information/80 active:bg-information focus-visible:ring-information/20 dark:bg-information/60 dark:focus-visible:ring-information/40',
        positive:
          'bg-positive/50 border-positive text-foreground hover:bg-positive/35 active:bg-positive/50 focus-visible:ring-positive/50 dark:bg-positive/60 dark:hover:bg-positive/80',
        brand:
          'bg-brand-500/50 border-brand-500 text-foreground hover:bg-brand-500/70 active:bg-brand-500/55 focus-visible:ring-brand-600/50',
        vibrant:
          'bg-fuchsia-700 hover:bg-fuchsia-700/70 text-neutral-200 dark:bg-fuchsia-600/65 dark:hover:bg-fuchsia-600/75 hover:border-fuchsia-500/75 active:bg-fuchsia-700 dark:active:bg-fuchsia-600/60',
        outline:
          'border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-foreground underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xxs: "h-5.5 gap-1 rounded-full px-2 py-0.5 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  children,
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const child = asChild && React.isValidElement(children) ? children : undefined;

  return (
    <ButtonPrimitive
      data-slot='button'
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      render={render ?? child}
      nativeButton={nativeButton ?? (child ? false : undefined)}
      {...props}
    >
      {child ? undefined : children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
