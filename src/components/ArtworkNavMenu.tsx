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
  { label: 'Paintings', to: '/' },
  { label: 'Drawings', to: '/' },
  { label: 'Prints', to: '/' },
  { label: 'Sculpture', to: '/' },
  { label: 'Mixed Media', to: '/' },
] as const;

export function ArtworkNavMenu() {
  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList className='gap-0'>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='nav-menu-link nav-menu-link-color-hover h-auto bg-transparent px-2 py-0 hover:bg-transparent hover:text-foreground focus:bg-transparent focus:text-foreground data-[state=open]:bg-transparent data-[state=open]:text-foreground data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent'>
            Artwork
          </NavigationMenuTrigger>
          <NavigationMenuContent className='left-1/8 -translate-x-1/8 group-data-[viewport=false]/navigation-menu:rounded-xs group-data-[viewport=false]/navigation-menu:border border-border group-data-[viewport=false]/navigation-menu:shadow-xl shadow-shadow-card bg-stone-200 z-50'>
            <ul className='grid min-w-40 gap-1 p-0'>
              {artworkLinks.map(({ label, to }) => (
                <li key={label}>
                  <NavigationMenuLink asChild>
                    <Link
                      to={to}
                      className='text-muted-foreground transition-colors nav-menu-link-color-hover'
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
