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
  'inline text-muted-foreground/60 pointer-events-none cursor-default transition-colors hover:bg-transparent hover:text-muted-foreground/60 focus:bg-transparent focus:text-muted-foreground/60 dark:hover:bg-transparent';

export function ArtworkNavMenu() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <NavigationMenu viewport={false}>
      <NavigationMenuList className='gap-0'>
        <NavigationMenuItem>
          <NavigationMenuTrigger className='nav-menu-link nav-menu-link-color-hover h-auto bg-transparent px-1 xxs:px-2 pt-1 pb-0 hover:bg-transparent hover:text-foreground focus:bg-transparent focus:text-foreground data-[state=open]:bg-transparent data-[state=open]:text-foreground data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent'>
            Artwork
          </NavigationMenuTrigger>
          <NavigationMenuContent className='left-1/4 -translate-x-1/8 group-data-[viewport=false]/navigation-menu:rounded-xs group-data-[viewport=false]/navigation-menu:border border-popover-border group-data-[viewport=false]/navigation-menu:shadow-xl shadow-shadow-card z-50 max-w-75 w-max'>
            <ul className='grid min-w-40 gap-1 p-0'>
              {artworkCategoryLinks.map(({ label, params, to }) => {
                const isActive = pathname === `/category/${params.category}`;

                return (
                  <li key={label}>
                    <NavigationMenuLink asChild>
                      {isActive ? (
                        <span aria-current='page' className={activeCategoryLinkClassName}>
                          {label}{' '}
                          <span className='inline text-xs text-muted-foreground/60'>(current)</span>
                        </span>
                      ) : (
                        <Link
                          to={to}
                          params={params}
                          className='pt-1 pb-0 text-muted-foreground transition-colors nav-menu-link-color-hover'
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
