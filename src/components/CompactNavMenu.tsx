import { Link, useRouterState } from '@tanstack/react-router';
import { Menu } from 'lucide-react';

import { activeLinkClassName, linkClassName } from '@/components/Header';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/shared/utils';

const links = [
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
] as const;

export function CompactNavMenu({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <NavigationMenu
      render={<div />}
      viewport={false}
      align='end'
      className={cn('hidden flex-none', className)}
    >
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            aria-label='More pages'
            className={cn(
              'data-[state=open]:bg-transparent data-[state=open]:hover:bg-brand-200/80 data-[state=open]:dark:hover:bg-brand-700/80 data-[state=open]:focus:bg-transparent focus:bg-transparent h-auto data-[state=open]:text-foreground focus:text-foreground [&>svg]:hidden',
              linkClassName,
            )}
          >
            <span aria-hidden='true'>
              <Menu className='size-5.5' />
            </span>
          </NavigationMenuTrigger>
          <NavigationMenuContent className='z-50 shadow-shadow-card group-data-[viewport=false]/navigation-menu:shadow-xl group-data-[viewport=false]/navigation-menu:border border-border-2nd group-data-[viewport=false]/navigation-menu:rounded-xs w-max max-w-75'>
            <ul className='gap-1 grid p-0 min-w-40'>
              {links.map(({ to, label }) => {
                const isActive = pathname === to;

                return (
                  <li key={to}>
                    <NavigationMenuLink asChild closeOnClick>
                      {isActive ? (
                        <span
                          aria-current='page'
                          className={cn(linkClassName, activeLinkClassName, 'items-start')}
                        >
                          {label}
                        </span>
                      ) : (
                        <Link to={to} className={cn(linkClassName, 'items-start')}>
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
