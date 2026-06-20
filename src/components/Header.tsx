import { Link } from '@tanstack/react-router';

import { ArtworkNavMenu } from './ArtworkNavMenu';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className='fixed z-20 flex justify-center bg-background w-full h-48 sm:h-52 xl:h-38'>
      <div className='relative flex flex-col xl:flex-row items-center sm:items-start xl:items-center justify-center xl:justify-start gap-7 xl:gap-20 max-w-7xl w-full h-full px-4 xxs:px-6 xs:px-10 sm:px-12'>
        <Link to='/' className='hidden xs:block max-w-160 w-full h-auto'>
          <img
            src='/logo-h-640.webp'
            alt='Carla Stine'
            width='640'
            height='55'
            className='hidden xs:block max-w-160 w-full h-auto'
          />
        </Link>
        <Link to='/' className='block xs:hidden max-w-83.5 w-full h-auto'>
          <img
            src='/logo-stacked-334.webp'
            alt='Carla Stine'
            width='334'
            height='69'
            className='w-full h-auto'
          />
        </Link>

        <nav className='flex justify-between xs:justify-center xl:justify-start w-full xs:w-auto max-w-100 xs:max-w-full xs:gap-8 xl:gap-6 xl:mt-4 nav-menu-link grow-0'>
          <ArtworkNavMenu />
          <a
            href='https://shopify.com'
            className='px-1 xxs:px-2 py-1 rounded-md nav-menu-link-color-hover'
          >
            Shop
          </a>
          <Link to='/about' className='px-1 xxs:px-2 py-1 rounded-md nav-menu-link-color-hover'>
            About
          </Link>
          <Link to='/contact' className='px-1 xxs:px-2 py-1 rounded-md nav-menu-link-color-hover'>
            Contact
          </Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
