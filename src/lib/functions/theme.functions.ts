import { createServerFn } from '@tanstack/react-start';

export type Theme = 'light' | 'dark';

const THEME_COOKIE_NAME = 'carla-theme';
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function parseTheme(value: unknown): Theme | null {
  if (value === 'light' || value === 'dark') {
    return value;
  }

  return null;
}

export const getThemePreference = createServerFn({ method: 'GET' }).handler(async () => {
  const { getCookie } = await import('@tanstack/react-start/server');
  return parseTheme(getCookie(THEME_COOKIE_NAME));
});

export const setThemePreference = createServerFn({ method: 'POST' })
  .validator((data: { theme: Theme }) => {
    const theme = parseTheme(data?.theme);

    if (!theme) {
      throw new Error('Theme must be light or dark');
    }

    return { theme };
  })
  .handler(async ({ data }) => {
    const { setCookie } = await import('@tanstack/react-start/server');

    setCookie(THEME_COOKIE_NAME, data.theme, {
      maxAge: THEME_COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    });

    return data.theme;
  });
