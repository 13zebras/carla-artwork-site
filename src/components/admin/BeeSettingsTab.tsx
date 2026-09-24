import { useState } from 'react';
import type { SubmitEvent } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { TabsContent } from '@/components/ui/tabs';
import { saveBeeSettings } from '@/lib/functions/bee-settings.functions';
import {
  DEFAULT_BEE_SETTINGS,
  beeSettingsEqual,
  beeSettingToSlider,
  sliderToBeeSetting,
} from '@/lib/shared/bee-settings';
import type { BeeSettingKey, BeeSettings, BeeSettingsSnapshot } from '@/lib/shared/bee-settings';

type BeeControl = {
  keys: BeeSettingKey[];
  label: string;
  description: string;
};

const controlGroups: { title: string; controls: BeeControl[] }[] = [
  {
    title: 'Flight',
    controls: [
      {
        keys: ['minSpeed', 'maxSpeed'],
        label: 'Flight speed',
        description: 'Makes the bee fly faster.',
      },
      { keys: ['size'], label: 'Bee size', description: 'Makes the bee bigger.' },
      { keys: ['loopSize'], label: 'Loop size', description: 'Makes the bee fly bigger loops.' },
      {
        keys: ['travelIntensity'],
        label: 'Wandering',
        description: 'Makes the bee wander more between loops.',
      },
      {
        keys: ['loopSpacing'],
        label: 'Loop frequency',
        description: 'Makes the bee loop more often.',
      },
      {
        keys: ['maxQuadrantSeconds'],
        label: 'Exploring',
        description: 'Makes the bee move to another area sooner.',
      },
      {
        keys: ['loopVariation'],
        label: 'Loop variety',
        description: 'Makes the loops less alike.',
      },
    ],
  },
  {
    title: 'Trail',
    controls: [
      {
        keys: ['trailLifetime'],
        label: 'Trail duration',
        description: 'Keeps the trail visible longer.',
      },
      {
        keys: ['trailOpacity'],
        label: 'Trail visibility',
        description: 'Makes the trail easier to see.',
      },
      { keys: ['trailWidth'], label: 'Trail thickness', description: 'Makes the trail thicker.' },
    ],
  },
];

function formatSliderValue(value: number) {
  return String(Number(value.toFixed(1)));
}

function BeeControlSlider({
  control,
  draft,
  disabled,
  onChange,
}: {
  control: BeeControl;
  draft: BeeSettings;
  disabled: boolean;
  onChange: (changes: Partial<BeeSettings>) => void;
}) {
  const { keys, label, description } = control;
  const id = `bee-${keys[0]}`;
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const isSize = keys[0] === 'size';
  const isRange = keys.length === 2;
  const values = keys.map((key) => beeSettingToSlider(key, draft[key]));
  let displayValue = values.map(formatSliderValue).join(' – ');
  if (isSize) displayValue = `${draft.size}px`;

  function handleChange(next: number | readonly number[]) {
    const nextValues = typeof next === 'number' ? [next] : next;
    const changes: Partial<BeeSettings> = {};
    keys.forEach((key, index) => {
      // Preserve untouched physical values exactly, including the other range thumb.
      if (nextValues[index] !== values[index]) {
        changes[key] = sliderToBeeSetting(key, nextValues[index]);
      }
    });
    onChange(changes);
  }

  function getAriaLabel(index: number) {
    if (!isRange) return label;
    const end = index === 0 ? 'Slowest' : 'Fastest';
    return `${label}: ${end}`;
  }

  function getAriaValueText(_formatted: string, value: number) {
    if (isSize) return `${value} pixels`;
    return `${formatSliderValue(value)} out of 100`;
  }

  return (
    <div className='grid gap-3'>
      <div className='flex items-center justify-between gap-4'>
        <Label id={labelId} htmlFor={id} className='text-base font-semibold'>
          {label}
        </Label>
        <output aria-labelledby={labelId} className='text-sm tabular-nums text-muted-foreground'>
          {displayValue}
        </output>
      </div>
      <Slider
        id={id}
        value={values}
        min={isSize ? 16 : 0}
        max={isSize ? 48 : 100}
        step={1}
        disabled={disabled}
        thumbCollisionBehavior='none'
        onValueChange={handleChange}
        thumbProps={{
          'aria-labelledby': isRange ? undefined : labelId,
          'aria-describedby': descriptionId,
          getAriaLabel,
          getAriaValueText,
        }}
      />
      <p id={descriptionId} className='text-sm text-muted-foreground'>
        {description}
      </p>
      <div aria-hidden='true' className='flex justify-between text-xs text-muted-foreground'>
        <span>{isSize ? '16px' : '0'}</span>
        <span>{isSize ? '48px' : '100'}</span>
      </div>
      {isRange && (
        <p className='text-xs text-muted-foreground'>
          Left handle: slowest. Right handle: fastest.
        </p>
      )}
    </div>
  );
}

export function BeeSettingsTab({ bee }: { bee: BeeSettingsSnapshot }) {
  const [saved, setSaved] = useState(bee.settings);
  const [draft, setDraft] = useState(bee.settings);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasChanges = !beeSettingsEqual(saved, draft);

  function updateDraft(changes: Partial<BeeSettings>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || !hasChanges) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await saveBeeSettings({ data: draft });
      setSaved(result.settings);
      setDraft(result.settings);
      toast.success('Bee changes saved. Open pages update within about 15 seconds.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save bee settings.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <TabsContent value='bee' className='mx-auto mt-4 w-full max-w-300'>
      <Card className='rounded-sm'>
        <CardHeader>
          <CardTitle className='text-xl font-semibold'>Bee</CardTitle>
          <CardDescription>
            Adjust the bee and its trail. Changes go live only when you save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Exact defaults can have fractional slider positions; validate physical settings on the server. */}
          <form noValidate onSubmit={handleSubmit} className='grid gap-10'>
            {controlGroups.map(({ title, controls }) => (
              <fieldset key={title} disabled={isSaving} className='grid gap-6'>
                <legend className='mb-6 text-lg font-semibold'>{title}</legend>
                <div className='grid grid-cols-2 gap-x-12 gap-y-8'>
                  {controls.map((control) => (
                    <BeeControlSlider
                      key={control.keys[0]}
                      control={control}
                      draft={draft}
                      disabled={isSaving}
                      onChange={updateDraft}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
            {error && (
              <Alert variant='destructive'>
                <AlertTitle>Bee changes not saved</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className='grid gap-4 border-t pt-6'>
              <p className='text-sm text-muted-foreground'>
                Saved changes reach open website pages within about 15 seconds.
              </p>
              <div className='flex items-center gap-4'>
                <Button
                  type='submit'
                  variant='brand'
                  size='lg'
                  disabled={isSaving || !hasChanges}
                  className='min-w-60 rounded-lg text-base font-semibold'
                >
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  disabled={isSaving || beeSettingsEqual(draft, DEFAULT_BEE_SETTINGS)}
                  onClick={() => setDraft({ ...DEFAULT_BEE_SETTINGS })}
                >
                  Reset to defaults
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
