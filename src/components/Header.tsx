import { Link } from '@tanstack/react-router';

import { ArtworkNavMenu } from './ArtworkNavMenu';
// import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className='relative z-50 flex items-center justify-center gap-6 text-foreground bg-white/10 px-10 pt-6 pb-8'>
      <div className='flex flex-col lg:flex-row items-center sm:items-start lg:items-center  justify-center gap-8 lg:gap-16 w-full'>
        <img
          src='/logo-h.webp'
          alt='Carla Stine'
          width='501'
          height='77'
          className='hidden xs:block max-w-[501px] w-full h-auto'
        />
        <img
          src='/logo-stacked.webp'
          alt='Carla Stine'
          width='310'
          height='77'
          className='block xs:hidden max-w-[310px] w-full h-auto'
        />

        <nav className='flex gap-8 xs:gap-12 lg:gap-8 lg:mt-3 text-muted-foreground text-base xs:text-lg'>
          <ArtworkNavMenu />
          <Link to='.' className='transition-colors hover:text-foreground'>
            Shop
          </Link>
          <Link to='.' className='transition-colors hover:text-foreground'>
            About
          </Link>
          <Link to='.' className='transition-colors hover:text-foreground'>
            Contact
          </Link>
        </nav>
      </div>
      {/* <ThemeToggle /> */}
    </header>
  );
}
