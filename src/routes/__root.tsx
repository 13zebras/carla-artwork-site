import { TanStackDevtools } from '@tanstack/react-devtools';
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';

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
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
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

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
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
