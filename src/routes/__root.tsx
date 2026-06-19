import { TanStackDevtools } from '@tanstack/react-devtools';
import { HeadContent, Outlet, Link, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

import { TooltipProvider } from '@/components/ui/tooltip';

import appCss from '../styles.css?url';

export const Route = createRootRoute({
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
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

const themeScript = `
(function () {
  try {
    var storedTheme = window.localStorage.getItem('carla-theme');
    var theme =
      storedTheme === 'dark' || storedTheme === 'light'
        ? storedTheme
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';

    document.documentElement.classList.add(theme);
  } catch (_) {}
})();
`;

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en' className='min-h-full'>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body className='m-0 bg-background text-foreground min-h-full bg-linear-to-b from-bg-background to-bg-gradient'>
        <TooltipProvider>{children}</TooltipProvider>
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
    <div className='flex flex-col items-center justify-center gap-16 h-screen'>
      <h1 className='text-3xl font-bold'>404 - Not Found</h1>
      <p className='text-muted-foreground text-lg'>The page you are looking for does not exist.</p>
      <Link to='/' className='text-sky-600 hover:text-sky-500 transition-colors text-lg'>
        Go to home page
      </Link>
    </div>
  );
}
