import { Link, useRouterState } from '@tanstack/react-router';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { artworkCategoryLinks } from '@/data/artworkCategories';
import { cn } from '@/lib/shared/utils';

import { linkClassName, activeLinkClassName } from './Header';

export function ArtworkNavMenu() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList className='gap-0'>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              'data-[state=open]:bg-transparent data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent focus:bg-transparent h-auto data-[state=open]:text-foreground focus:text-foreground',
              linkClassName,
            )}
          >
            Artwork
          </NavigationMenuTrigger>
          <NavigationMenuContent className='z-50 shadow-shadow-card group-data-[viewport=false]/navigation-menu:shadow-xl group-data-[viewport=false]/navigation-menu:border border-border-2nd group-data-[viewport=false]/navigation-menu:rounded-xs w-max max-w-75'>
            <ul className='gap-1 grid p-0 min-w-40'>
              {artworkCategoryLinks.map(({ label, params, to }) => {
                const isActive = pathname === `/category/${params.category}`;

                return (
                  <li key={label}>
                    <NavigationMenuLink asChild>
                      {isActive ? (
                        <span
                          aria-current='page'
                          className={cn(linkClassName, activeLinkClassName)}
                        >
                          {label}
                        </span>
                      ) : (
                        <Link
                          to={to}
                          params={params}
                          className={cn(linkClassName, 'transition-colors')}
                        >
                          {label}
                        </Link>
                      )}
                    </NavigationMenuLink>
                  </li>
                );
              })}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
