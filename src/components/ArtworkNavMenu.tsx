import { Link } from '@tanstack/react-router';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

const artworkLinks = [
  { label: 'Paintings', to: '.' },
  { label: 'Drawings', to: '.' },
  { label: 'Prints', to: '.' },
  { label: 'Sculpture', to: '.' },
  { label: 'Mixed Media', to: '.' },
] as const;

export function ArtworkNavMenu() {
  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList className='gap-0'>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='h-auto bg-transparent px-0 py-0 text-base xs:text-lg font-normal text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground focus:bg-transparent focus:text-foreground data-[state=open]:bg-transparent data-[state=open]:text-foreground data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent'>
            Artwork
          </NavigationMenuTrigger>
          <NavigationMenuContent className='left-1/8 -translate-x-1/8 group-data-[viewport=false]/navigation-menu:rounded-xs group-data-[viewport=false]/navigation-menu:border-0 group-data-[viewport=false]/navigation-menu:shadow-xl/50 bg-stone-100'>
            <ul className='grid min-w-40 gap-1 p-0'>
              {artworkLinks.map(({ label, to }) => (
                <li key={label}>
                  <NavigationMenuLink asChild>
                    <Link
                      to={to}
                      className='block rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sky-100 hover:text-accent-foreground'
                    >
                      {label}
                    </Link>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
