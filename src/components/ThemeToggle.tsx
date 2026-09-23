import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/ThemeProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/shared/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { effectiveTheme, toggleTheme } = useTheme();

  function handleToggle() {
    void toggleTheme().catch((error) => {
      console.error('Unable to save theme preference', error);
    });
  }

  const toolTipContent = effectiveTheme === 'dark' ? 'Select light mode' : 'Select dark mode';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          aria-label='Toggle color theme'
          onClick={handleToggle}
          className={cn(
            'inline-flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full border-0 dark:bg-yellow-400/20 hover:dark:bg-yellow-400/40 active:dark:bg-yellow-600/40 bg-sky-300/25 hover:bg-sky-300/40 active:bg-sky-400/40 cursor-pointer transition duration-300 hover:scale-[1.15] focus-visible:scale-[1.15] active:scale-[1.0]',
            className,
          )}
        >
          <span className='absolute inline-flex pointer-events-none dark:pointer-events-auto'>
            <Sun
              aria-hidden='true'
              className='size-4 sm:size-4.5 text-yellow-500 hover:text-yellow-400 opacity-0 motion-safe:transition-opacity motion-safe:duration-200 dark:opacity-100'
            />
          </span>

          <span className='absolute inline-flex pointer-events-auto dark:pointer-events-none'>
            <Moon
              aria-hidden='true'
              className='size-4 sm:size-4.5 text-sky-400 hover:text-sky-500 opacity-100 motion-safe:transition-opacity motion-safe:duration-200 dark:opacity-0'
            />
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side='left' sideOffset={8}>
        {toolTipContent}
      </TooltipContent>
    </Tooltip>
  );
}
