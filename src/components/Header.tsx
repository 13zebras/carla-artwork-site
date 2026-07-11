import { Link, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { cn } from '@/lib/shared/utils';

import { ArtworkNavMenu } from './ArtworkNavMenu';
import { ThemeToggle } from './ThemeToggle';

export const linkClassName =
  'font-hand-rendered text-muted-foreground text-sm xs:text-base px-1 xxs:px-2 pt-1 pb-1 rounded-md hover:text-foreground hover:bg-brand-200/60 active:text-foreground active:bg-brand-300/60 dark:hover:bg-brand-700/80 dark:active:bg-brand-700/70' as const;

export const activeLinkClassName =
  'text-muted-foreground/60 pointer-events-none cursor-default transition-colors hover:bg-transparent hover:text-muted-foreground/60 focus:bg-transparent focus:text-muted-foreground/60 dark:hover:bg-transparent' as const;

function HomeLogoLink({ className, children }: { className: string; children: ReactNode }) {
  const isHome = useRouterState({ select: (state) => state.location.pathname === '/' });

  if (isHome) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Link to='/' className={className}>
      {children}
    </Link>
  );
}

export function Header() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <header className='z-20 fixed flex justify-center bg-background w-full h-50 sm:h-52 xl:h-38'>
      <div className='relative flex xl:flex-row flex-col justify-center xl:justify-between items-center sm:items-start xl:items-center gap-7 xl:gap-20 px-4 xs:px-10 xxs:px-6 sm:px-12 w-full max-w-7xl h-full'>
        <HomeLogoLink className='hidden xs:block w-full max-w-162.5 h-auto'>
          <img
            src='/header-logos/logo-h-650x55.webp'
            srcSet='/header-logos/logo-h-650x55.webp 1x, /header-logos/logo-h-1300x110.webp 2x'
            alt='Carla Stine'
            width={650}
            height={55}
            className='hidden xs:block w-full h-auto'
          />
        </HomeLogoLink>
        <HomeLogoLink className='xs:hidden block w-full max-w-83.75 h-auto'>
          <img
            src='/header-logos/logo-stacked-335x70.webp'
            srcSet='/header-logos/logo-stacked-335x70.webp 1x, /header-logos/logo-stacked-670x140.webp 2x'
            alt='Carla Stine'
            width={335}
            height={70}
            className='w-full h-auto'
          />
        </HomeLogoLink>

        <nav className='flex justify-between xs:justify-center xl:justify-end xs:gap-8 xl:gap-4 xl:mt-4 w-full xs:w-auto max-w-100 xs:max-w-full grow-0'>
          <ArtworkNavMenu />
          <a href='https://shopify.com' className={linkClassName}>
            Shop
          </a>
          <Link
            to='/about'
            className={cn(linkClassName, pathname === '/about' && activeLinkClassName)}
          >
            About
          </Link>
          <Link
            to='/contact'
            className={cn(linkClassName, pathname === '/contact' && activeLinkClassName)}
          >
            Contact
          </Link>
        </nav>
        <ThemeToggle className='top-2 xs:top-3 right-2 xs:right-3 sm:right-4 z-50 absolute' />
      </div>
    </header>
  );
}
