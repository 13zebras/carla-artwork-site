import { Link } from '@tanstack/react-router';

import { ArtworkNavMenu } from './ArtworkNavMenu';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className='fixed z-20 flex justify-center text-foreground bg-background w-full h-50 lg:h-35'>
      <div className='relative flex flex-col lg:flex-row items-center sm:items-start lg:items-center justify-center lg:justify-start gap-8 lg:gap-20 w-7xl h-full px-10 pt-8 pb-8'>
        <img
          src='/logo-h-520.webp'
          alt='Carla Stine'
          width='520'
          height='69'
          className='hidden xs:block max-w-130 w-full h-auto'
        />
        <img
          src='/logo-stacked-334.webp'
          alt='Carla Stine'
          width='334'
          height='69'
          className='block xs:hidden max-w-83.5 w-full h-auto'
        />

        <nav className='flex gap-6 xs:gap-12 lg:gap-8 lg:mt-3 text-muted-foreground text-base xs:text-lg'>
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
        <ThemeToggle />
      </div>
    </header>
  );
}
