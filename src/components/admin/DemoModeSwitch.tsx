import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { setDemoMode } from '@/lib/functions/site-settings.functions';

type DemoModeSwitchProps = {
  demoMode: boolean;
};

export function DemoModeSwitch({ demoMode }: DemoModeSwitchProps) {
  const [isChecked, setIsChecked] = useState(demoMode);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setIsChecked(demoMode), [demoMode]);

  async function handleCheckedChange(checked: boolean) {
    setIsSaving(true);

    try {
      const settings = await setDemoMode({ data: { demoMode: checked } });
      setIsChecked(settings.demoMode);
      toast.success(settings.demoMode ? 'Demo mode enabled' : 'Live artwork enabled');
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Unable to update demo mode';
      toast.error('Demo mode was not changed', { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className='flex items-center gap-3 bg-background/70 px-3 py-2 border border-neutral-300/70 dark:border-neutral-700 rounded-lg'>
      <Label htmlFor='demo-mode' className='w-26.25 text-sm whitespace-nowrap cursor-pointer'>
        Demo mode
        <span className='font-normal text-muted-foreground text-xs'>
          {isChecked ? 'On' : 'Off'}
        </span>
      </Label>
      <Switch
        id='demo-mode'
        checked={isChecked}
        disabled={isSaving}
        aria-describedby='demo-mode-description'
        onCheckedChange={(checked) => void handleCheckedChange(checked)}
      />
      <span id='demo-mode-description' className='sr-only'>
        Use sample artwork on the public website instead of published database artwork.
      </span>
    </div>
  );
}
