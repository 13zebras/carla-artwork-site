import { Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useLocalStorage<Theme>(THEME_STORAGE_KEY, getInitialTheme, {
    initializeWithValue: true,
    serializer: (value) => value,
    deserializer: (value) => value as Theme,
  });

  useEffect(() => {
    setRootTheme(theme);
  }, [theme]);

  const currentTheme = getRootTheme() ?? theme;

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
      className={cn(
        'inline-flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full border-0 dark:bg-yellow-400/20 hover:dark:bg-yellow-400/40 bg-sky-300/15 hover:bg-sky-300/25 cursor-pointer transition duration-300 hover:scale-[1.2] focus-visible:scale-[1.2] active:scale-[1.05]',
        className,
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className='absolute inline-flex pointer-events-none dark:pointer-events-auto'>
            <Sun
              aria-hidden='true'
              className='size-4 sm:size-4.5 text-yellow-500 hover:text-yellow-400 opacity-0 motion-safe:transition-opacity motion-safe:duration-200 dark:opacity-100'
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side='left'>select light mode</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className='absolute inline-flex pointer-events-auto dark:pointer-events-none'>
            <Moon
              aria-hidden='true'
              className='size-4 sm:size-4.5 text-sky-400 hover:text-sky-500 opacity-100 motion-safe:transition-opacity motion-safe:duration-200 dark:opacity-0'
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side='left'>select dark mode</TooltipContent>
      </Tooltip>
    </button>
  );
}
