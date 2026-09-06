export const ANIMATION_TYPE_OPTIONS = [
  { value: 'bubble-up', label: 'BubbleUp' },
  { value: 'random', label: 'Random' },
] as const;

export type AnimationType = (typeof ANIMATION_TYPE_OPTIONS)[number]['value'];

export function isAnimationType(value: unknown): value is AnimationType {
  return ANIMATION_TYPE_OPTIONS.some((option) => option.value === value);
}
