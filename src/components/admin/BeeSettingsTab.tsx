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
  beeSettingSliderLimits,
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
        label: 'Trail opacity',
        description: 'Higher number makes the trail darker, lower lighter.',
      },
      { keys: ['trailWidth'], label: 'Trail thickness', description: 'Makes the trail thicker.' },
    ],
  },
];

function formatSliderValue(value: number) {
  return String(Math.round(value));
}

function formatControlValue(key: BeeSettingKey, value: number) {
  const integer = formatSliderValue(value);
  if (key === 'size') return `${integer}px`;
  if (key === 'trailLifetime') return `${integer} seconds`;
  if (key === 'trailOpacity') return `${integer}%`;
  return integer;
}

function BeeControlInput(props: Parameters<typeof BeeControlSlider>[0]) {
  const { control, draft, disabled, onChange } = props;
  if (control.keys[0] !== 'trailWidth') return <BeeControlSlider {...props} />;

  return (
    <fieldset
      disabled={disabled}
      aria-describedby='bee-trailWidth-description'
      className='grid gap-3'
    >
      <legend className='mb-3 text-base font-semibold'>{control.label}</legend>
      <div className='flex flex-wrap gap-6'>
        {[1, 2, 3, 4].map((width) => (
          <div key={width} className='flex items-center gap-2'>
            <input
              type='radio'
              id={`bee-trailWidth-${width}`}
              name='trailWidth'
              aria-label={`${width}px`}
              value={width}
              checked={draft.trailWidth === width}
              disabled={disabled}
              onChange={() => onChange({ trailWidth: width })}
              className='size-4 accent-brand-500 cursor-pointer disabled:cursor-not-allowed'
            />
            <Label htmlFor={`bee-trailWidth-${width}`} className='cursor-pointer font-normal'>
              {width}px
            </Label>
          </div>
        ))}
      </div>
      <p id='bee-trailWidth-description' className='text-sm text-muted-foreground'>
        {control.description}
      </p>
    </fieldset>
  );
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
  const key = keys[0];
  const { min, max } = beeSettingSliderLimits(key);
  const isRange = keys.length === 2;
  const values = keys.map((key) => beeSettingToSlider(key, draft[key]));
  const displayValue = values.map((value) => formatControlValue(key, value)).join(' – ');

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
    const integer = formatSliderValue(value);
    if (key === 'size') return `${integer} pixels`;
    if (key === 'trailLifetime') return `${integer} seconds`;
    if (key === 'trailOpacity') return `${integer} percent`;
    return `${integer} out of 100`;
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
        min={min}
        max={max}
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

      <div aria-hidden='true' className='flex justify-between text-xs text-dim-fg'>
        <span>{formatControlValue(key, min)}</span>
        <span>{formatControlValue(key, max)}</span>
      </div>
      <p id={descriptionId} className='text-sm text-muted-foreground'>
        {description}
        {isRange && <span className='ml-2'>Left handle: slowest. Right handle: fastest.</span>}
      </p>
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
      <Card className='rounded-sm bg-card/60 gap-8 px-4'>
        <CardHeader>
          <CardTitle className='text-2xl font-semibold'>Bee Animation</CardTitle>
          <CardDescription>
            Adjust the bee and its trail. Changes go live only when you save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Exact defaults can have fractional slider positions; validate physical settings on the server. */}
          <form noValidate onSubmit={handleSubmit} className='grid gap-10'>
            {controlGroups.map(({ title, controls }) => (
              <fieldset key={title} disabled={isSaving} className='grid gap-6'>
                <legend className='mb-6 text-xl font-semibold'>{title}</legend>
                <div className='grid grid-cols-2 gap-x-20 gap-y-8'>
                  {controls.map((control) => (
                    <BeeControlInput
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
            <div className='grid justify-center gap-6 pt-2'>
              <div className='flex justify-center items-center gap-6'>
                <Button
                  type='submit'
                  variant='brand'
                  size='lg'
                  disabled={isSaving || !hasChanges}
                  className='min-w-50 rounded-lg text-base font-semibold'
                >
                  {isSaving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='lg'
                  disabled={isSaving || beeSettingsEqual(draft, DEFAULT_BEE_SETTINGS)}
                  onClick={() => setDraft({ ...DEFAULT_BEE_SETTINGS })}
                  className='min-w-50 rounded-lg text-base font-semibold'
                >
                  Reset to defaults
                </Button>
              </div>
              <p className='text-sm text-muted-foreground'>
                Saved changes reach open website pages within about 15 seconds.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
