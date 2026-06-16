import { Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'carla-theme';

function getRootTheme(): Theme | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const root = document.documentElement;

  if (root.classList.contains('dark')) {
    return 'dark';
  }

  if (root.classList.contains('light')) {
    return 'light';
  }

  return null;
}

function getInitialTheme(): Theme {
  const rootTheme = getRootTheme();

  if (rootTheme) {
    return rootTheme;
  }

  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function setRootTheme(theme: Theme) {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<Theme>(THEME_STORAGE_KEY, getInitialTheme, {
    initializeWithValue: true,
    serializer: (value) => value,
    deserializer: (value) => value as Theme,
  });

  useEffect(() => {
    setRootTheme(theme);
  }, [theme]);

  const currentTheme = getRootTheme() ?? theme;

  console.info('%c>>> theme', 'color: red', theme, typeof theme);

  function toggleTheme() {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    setRootTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type='button'
      aria-label='Toggle color theme'
      onClick={toggleTheme}
      className='relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-accent text-accent-foreground transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
    >
      <Sun
        aria-hidden='true'
        size={18}
        className='absolute text-yellow-400 opacity-0 motion-safe:transition-opacity motion-safe:duration-200 dark:opacity-100'
      />
      <Moon
        aria-hidden='true'
        size={18}
        className='absolute text-sky-300 opacity-100 motion-safe:transition-opacity motion-safe:duration-200 dark:opacity-0'
      />
    </button>
  );
}
