import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { setAnimationGrayscale } from '@/lib/functions/site-settings.functions';

type GrayscaleSwitchProps = {
  animationGrayscale: boolean;
};

export function GrayscaleSwitch({ animationGrayscale }: GrayscaleSwitchProps) {
  const [isChecked, setIsChecked] = useState(animationGrayscale);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setIsChecked(animationGrayscale), [animationGrayscale]);

  async function handleCheckedChange(checked: boolean) {
    setIsSaving(true);

    try {
      const settings = await setAnimationGrayscale({ data: { animationGrayscale: checked } });
      setIsChecked(settings.animationGrayscale);
      toast.success(
        settings.animationGrayscale ? 'Grayscale animation enabled' : 'Color animation enabled',
      );
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Unable to update animation grayscale';
      toast.error('Animation grayscale was not changed', { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className='flex items-center gap-3 bg-background/70 px-3 py-2 border border-neutral-300/70 dark:border-neutral-700 rounded-lg'>
      <Label htmlFor='grayscale' className='w-26.25 text-sm whitespace-nowrap cursor-pointer'>
        Grayscale
        <span className='font-normal text-muted-foreground text-xs'>
          {isChecked ? 'On' : 'Off'}
        </span>
      </Label>
      <Switch
        id='grayscale'
        checked={isChecked}
        disabled={isSaving}
        aria-describedby='grayscale-description'
        onCheckedChange={(checked) => void handleCheckedChange(checked)}
      />
      <span id='grayscale-description' className='sr-only'>
        Render the background animation circles in grayscale on the public website.
      </span>
    </div>
  );
}
