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

const activeCategoryLinkClassName =
  'font-hand-rendered inline text-muted-foreground/60 pointer-events-none cursor-default transition-colors hover:bg-transparent hover:text-muted-foreground/60 focus:bg-transparent focus:text-muted-foreground/60 dark:hover:bg-transparent';

export function ArtworkNavMenu() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList className='gap-0'>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='data-[state=open]:bg-transparent data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent focus:bg-transparent h-auto data-[state=open]:text-foreground focus:text-foreground nav-menu-link'>
            Artwork
          </NavigationMenuTrigger>
          <NavigationMenuContent className='z-50 shadow-shadow-card group-data-[viewport=false]/navigation-menu:shadow-xl group-data-[viewport=false]/navigation-menu:border border-popover-border group-data-[viewport=false]/navigation-menu:rounded-xs w-max max-w-75'>
            <ul className='gap-1 grid p-0 min-w-40'>
              {artworkCategoryLinks.map(({ label, params, to }) => {
                const isActive = pathname === `/category/${params.category}`;

                return (
                  <li key={label}>
                    <NavigationMenuLink asChild>
                      {isActive ? (
                        <span aria-current='page' className={activeCategoryLinkClassName}>
                          {label}{' '}
                          <span className='inline text-muted-foreground/60 text-xs'>(current)</span>
                        </span>
                      ) : (
                        <Link
                          to={to}
                          params={params}
                          className='text-muted-foreground transition-colors nav-menu-link'
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
