import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/ThemeProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/shared/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { toggleTheme } = useTheme();

  function handleToggle() {
    void toggleTheme().catch((error) => {
      console.error('Unable to save theme preference', error);
    });
  }

  return (
    <button
      type='button'
      aria-label='Toggle color theme'
      onClick={handleToggle}
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
        <TooltipContent side='bottom'>Select light mode</TooltipContent>
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
        <TooltipContent side='bottom'>Select dark mode</TooltipContent>
      </Tooltip>
    </button>
  );
}
