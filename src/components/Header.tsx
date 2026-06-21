import { Link, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { ArtworkNavMenu } from './ArtworkNavMenu';
import { ThemeToggle } from './ThemeToggle';

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
  return (
    <header className='fixed z-20 flex justify-center bg-background w-full h-48 sm:h-52 xl:h-38'>
      <div className='relative flex flex-col xl:flex-row items-center sm:items-start xl:items-center justify-center xl:justify-start gap-7 xl:gap-20 max-w-7xl w-full h-full px-4 xxs:px-6 xs:px-10 sm:px-12'>
        <HomeLogoLink className='hidden xs:block max-w-162.5 w-full h-auto'>
          <img
            src='/header-logos/logo-h-650x55.webp'
            srcSet='/header-logos/logo-h-650x55.webp 1x, /header-logos/logo-h-1300x110.webp 2x'
            alt='Carla Stine'
            width={650}
            height={55}
            className='hidden xs:block w-full h-auto'
          />
        </HomeLogoLink>
        <HomeLogoLink className='block xs:hidden max-w-83.75 w-full h-auto'>
          <img
            src='/header-logos/logo-stacked-335x70.webp'
            srcSet='/header-logos/logo-stacked-335x70.webp 1x, /header-logos/logo-stacked-670x140.webp 2x'
            alt='Carla Stine'
            width={335}
            height={70}
            className='w-full h-auto'
          />
        </HomeLogoLink>

        <nav className='flex justify-between xs:justify-center xl:justify-start w-full xs:w-auto max-w-100 xs:max-w-full xs:gap-8 xl:gap-6 xl:mt-4 nav-menu-link grow-0'>
          <ArtworkNavMenu />
          <a
            href='https://shopify.com'
            className='px-1 xxs:px-2 pt-1 pb-0 rounded-md nav-menu-link-color-hover'
          >
            Shop
          </a>
          <Link
            to='/about'
            className='px-1 xxs:px-2 pt-1 pb-0 rounded-md nav-menu-link-color-hover'
          >
            About
          </Link>
          <Link
            to='/contact'
            className='px-1 xxs:px-2 pt-1 pb-0 rounded-md nav-menu-link-color-hover'
          >
            Contact
          </Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
