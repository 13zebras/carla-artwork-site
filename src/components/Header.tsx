import { Link, useLoaderData, useRouterState } from '@tanstack/react-router';
import { Mail } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/shared/utils';

import { ArtworkNavMenu } from './ArtworkNavMenu';
import { ThemeToggle } from './ThemeToggle';

export const linkClassName =
  'flex font-hand-rendered text-muted-foreground text-[0.93rem] xxs:text-base px-1 xxs:px-2 items-center rounded-md hover:text-foreground hover:bg-brand-200/80 active:text-foreground active:bg-brand-300/60 dark:hover:bg-brand-700/80 dark:active:bg-brand-700/70' as const;

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
  const { categories, railwayEnvironmentName } = useLoaderData({ from: '__root__' });
  const isStaging = railwayEnvironmentName === 'staging';
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    const portfolioContent = document.querySelector<HTMLElement>('[data-portfolio-content]');

    if (!header) return;

    if (!portfolioContent) {
      header.removeAttribute('data-portfolio-behind');
      return;
    }

    let previousOverlap: boolean | undefined;

    const updateOverlap = () => {
      const headerBounds = header.getBoundingClientRect();
      const contentBounds = portfolioContent.getBoundingClientRect();

      const overlaps =
        contentBounds.top < headerBounds.bottom && contentBounds.bottom > headerBounds.top;

      if (overlaps === previousOverlap) return;

      previousOverlap = overlaps;
      header.toggleAttribute('data-portfolio-behind', overlaps);
    };

    updateOverlap();
    window.addEventListener('scroll', updateOverlap, { passive: true });
    window.addEventListener('resize', updateOverlap);

    return () => {
      window.removeEventListener('scroll', updateOverlap);
      window.removeEventListener('resize', updateOverlap);
      header.removeAttribute('data-portfolio-behind');
    };
  }, [pathname]);

  return (
    <header
      ref={headerRef}
      data-site-header
      className={cn(
        'z-20 fixed flex justify-center w-full h-41 xs:h-36 sm:h-37 md:h-38 xl:h-33 pb-2 xl:pb-0',
        'bg-background/10 backdrop-blur-[0px] data-portfolio-behind:bg-background/80 data-portfolio-behind:backdrop-blur-[3px]',
        isStaging && 'border-t-2 border-t-rose-900',
      )}
    >
      <div className='relative flex xl:flex-row flex-col justify-end xl:justify-between items-center gap-6 xl:gap-20 px-10 xxs:px-12 xs:px-14 sm:px-18 md:px-20 w-full max-w-7xl h-full'>
        <HomeLogoLink className='hidden xs:block w-full max-w-162.5 h-auto'>
          <img
            data-bee-logo='wide'
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
            data-bee-logo='compact'
            src='/header-logos/logo-stacked-335x70.webp'
            srcSet='/header-logos/logo-stacked-335x70.webp 1x, /header-logos/logo-stacked-670x140.webp 2x'
            alt='Carla Stine'
            width={335}
            height={70}
            className='w-full h-auto'
          />
        </HomeLogoLink>

        <nav className='flex justify-between xxs:justify-center xl:justify-end xxs:gap-6 xl:gap-4 xl:mt-4 w-full xs:w-auto max-w-100 xs:max-w-full grow-0'>
          <ArtworkNavMenu categories={categories} />
          <a href='/coming-soon' className={linkClassName} target='_blank'>
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
            className={cn(
              linkClassName,
              'hidden xs:flex',
              pathname === '/contact' && activeLinkClassName,
            )}
          >
            Contact
          </Link>
          <Link
            to='/contact'
            className={cn(
              linkClassName,
              'xs:hidden',
              pathname === '/contact' && activeLinkClassName,
            )}
          >
            <Mail className='size-6' />
          </Link>
        </nav>
        <ThemeToggle className='top-2 xs:top-3 right-2 xs:right-3 sm:right-4 z-50 absolute' />
      </div>
    </header>
  );
}
