import { TanStackDevtools } from '@tanstack/react-devtools';
import { HeadContent, Outlet, Link, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { listArtworkNavigationCategories } from '@/lib/functions/artworks.functions';
import { getThemePreference } from '@/lib/functions/theme.functions';
import { cn } from '@/lib/shared/utils';

import appCss from '../styles.css?url';

export const Route = createRootRoute({
  loader: async () => {
    const [categories, themePreference] = await Promise.all([
      listArtworkNavigationCategories(),
      getThemePreference(),
    ]);

    return { categories, themePreference };
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Carla Stine Artist Portfolio',
      },
    ],
    links: [
      {
        rel: 'preload',
        href: '/fonts/Hand_renderedInk-Regular.ttf',
        as: 'font',
        type: 'font/ttf',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  const { themePreference } = Route.useLoaderData();

  return (
    <ThemeProvider initialPreference={themePreference}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </ThemeProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { effectiveTheme } = useTheme();

  return (
    <html lang='en' className={cn('min-h-full', effectiveTheme)}>
      <head>
        <HeadContent />
      </head>
      <body className='bg-background to-bg-gradient bg-linear-to-b from-bg-background m-0 min-h-full text-foreground'>
        <TooltipProvider>
          {children}
          <Toaster theme={effectiveTheme ?? 'system'} richColors position='bottom-left' />
        </TooltipProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <div className='flex flex-col justify-center items-center gap-16 h-screen'>
      <h1 className='font-bold text-3xl'>404 - Not Found</h1>
      <p className='text-muted-foreground text-lg'>The page you are looking for does not exist.</p>
      <Link to='/' className='text-sky-600 hover:text-sky-500 text-lg transition-colors'>
        Go to home page
      </Link>
    </div>
  );
}
