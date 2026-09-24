import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '@/lib/shared/utils';

type SliderProps = SliderPrimitive.Root.Props & {
  thumbProps?: Pick<
    SliderPrimitive.Thumb.Props,
    'aria-labelledby' | 'aria-describedby' | 'getAriaLabel' | 'getAriaValueText'
  >;
};

function getValues(
  value: SliderProps['value'],
  defaultValue: SliderProps['defaultValue'],
  min: number,
  max: number,
) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'number') return [value];
  if (Array.isArray(defaultValue)) return defaultValue;
  if (typeof defaultValue === 'number') return [defaultValue];
  return [min, max];
}

// Official shadcn base-nova structure, with accessible thumb props and SSR indices.
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbProps,
  ...props
}: SliderProps) {
  const thumbs = getValues(value, defaultValue, min, max).map((_, index) => ({
    index,
    key: `thumb-${index}`,
  }));

  return (
    <SliderPrimitive.Root
      className={cn(
        'data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full',
        className,
      )}
      data-slot='slider'
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment='edge'
      {...props}
    >
      <SliderPrimitive.Control className='relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-40 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col'>
        <SliderPrimitive.Track
          data-slot='slider-track'
          className='relative grow overflow-hidden rounded-full bg-border-2nd select-none data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1'
        >
          <SliderPrimitive.Indicator
            data-slot='slider-range'
            className='bg-brand-500 select-none data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full'
          />
        </SliderPrimitive.Track>
        {thumbs.map(({ index, key }) => (
          <SliderPrimitive.Thumb
            key={key}
            index={index}
            data-slot='slider-thumb'
            className='relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50'
            {...thumbProps}
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };
