import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Label } from '@/components/ui/label';
import { setAnimationType } from '@/lib/functions/site-settings.functions';
import { ANIMATION_TYPE_OPTIONS, type AnimationType } from '@/lib/shared/site-settings.types';

type AnimationTypeSelectorProps = {
  animationType: AnimationType;
};

export function AnimationTypeSelector({ animationType }: AnimationTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState(animationType);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setSelectedType(animationType), [animationType]);

  async function handleAnimationTypeChange(nextType: AnimationType) {
    if (nextType === selectedType) return;

    setIsSaving(true);

    try {
      const settings = await setAnimationType({ data: { animationType: nextType } });
      setSelectedType(settings.animationType);
      const selectedOption = ANIMATION_TYPE_OPTIONS.find(
        (option) => option.value === settings.animationType,
      );
      toast.success(`${selectedOption?.label ?? 'Selected'} animation enabled`);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Unable to update animation type';
      toast.error('Animation type was not changed', { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <fieldset
      disabled={isSaving}
      className='flex items-center gap-3 bg-background/70 px-3 py-2 border border-neutral-300/70 dark:border-neutral-700 rounded-lg'
    >
      <legend className='sr-only'>Animation Type</legend>
      <span className='text-sm whitespace-nowrap'>Animation Type</span>
      <div className='flex items-center gap-3'>
        {ANIMATION_TYPE_OPTIONS.map((option) => {
          const id = `animation-type-${option.value}`;

          return (
            <div key={option.value} className='flex items-center gap-1.5'>
              <input
                id={id}
                type='radio'
                name='animation-type'
                value={option.value}
                checked={selectedType === option.value}
                disabled={isSaving}
                aria-label={option.label}
                className='peer size-4 accent-brand-500 cursor-pointer disabled:cursor-not-allowed'
                onChange={() => void handleAnimationTypeChange(option.value)}
              />
              <Label
                htmlFor={id}
                className='font-normal text-xs whitespace-nowrap cursor-pointer peer-disabled:cursor-not-allowed'
              >
                {option.label}
              </Label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
