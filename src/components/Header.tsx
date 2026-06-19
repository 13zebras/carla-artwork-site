import { Link } from '@tanstack/react-router';

import { ArtworkNavMenu } from './ArtworkNavMenu';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className='fixed z-20 flex justify-center bg-background w-full h-52 lg:h-38'>
      <div className='relative flex flex-col lg:flex-row items-center sm:items-start lg:items-center justify-center lg:justify-start gap-6 lg:gap-20 max-w-7xl w-full h-full px-6 xs:px-10'>
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

        <nav className='flex justify-between xs:justify-center lg:justify-start max-w-80 xs:max-w-full w-full xs:gap-10 lg:gap-6 lg:mt-3 nav-menu-link'>
          <ArtworkNavMenu />
          <a href='https://shopify.com' className='px-2 py-1 rounded-md nav-menu-link-color-hover'>
            Shop
          </a>
          <Link to='/about' className='px-2 py-1 rounded-md nav-menu-link-color-hover'>
            About
          </Link>
          <Link to='/contact' className='px-2 py-1 rounded-md nav-menu-link-color-hover'>
            Contact
          </Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
