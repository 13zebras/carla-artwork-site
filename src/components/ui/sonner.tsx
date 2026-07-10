import { useEffect, useState } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

type Theme = 'light' | 'dark' | 'system';

/**
 * Reads the active theme from the `<html>` class (set by ThemeToggle and the
 * root theme script). Mirrors ThemeToggle's class-based scheme so toasts always
 * match the current app theme, including manual toggles.
 */
function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === 'undefined') {
      return 'system';
    }

    if (document.documentElement.classList.contains('dark')) {
      return 'dark';
    }

    if (document.documentElement.classList.contains('light')) {
      return 'light';
    }

    return 'system';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains('dark')) {
        setTheme('dark');
      } else if (document.documentElement.classList.contains('light')) {
        setTheme('light');
      } else {
        setTheme('system');
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

function Toaster({ ...props }: ToasterProps) {
  const theme = useTheme();

  return (
    <Sonner
      theme={theme}
      className='toaster group'
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
