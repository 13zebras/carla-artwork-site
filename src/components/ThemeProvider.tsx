import { useRouterState } from '@tanstack/react-router';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  setThemePreference,
  type Theme,
} from '@/lib/functions/theme.functions';

type ThemeContextValue = {
  effectiveTheme: Theme | null;
  preference: Theme | null;
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isForcedDarkPath(pathname: string) {
  return pathname === '/login' || pathname === '/admin' || pathname.startsWith('/admin/');
}

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({
  children,
  initialPreference,
}: {
  children: ReactNode;
  initialPreference: Theme | null;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [preference, setPreference] = useState<Theme | null>(initialPreference);
  const effectiveTheme = isForcedDarkPath(pathname) ? 'dark' : preference;

  const toggleTheme = useCallback(async () => {
    const currentTheme = preference ?? getSystemTheme();
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    setPreference(nextTheme);

    try {
      await setThemePreference({ data: { theme: nextTheme } });
    } catch (error) {
      setPreference(preference);
      throw error;
    }
  }, [preference]);

  const value = useMemo(
    () => ({ effectiveTheme, preference, toggleTheme }),
    [effectiveTheme, preference, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
