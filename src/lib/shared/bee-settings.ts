export const BEE_SETTING_LIMITS = {
  minSpeed: { min: 15, max: 150 },
  maxSpeed: { min: 15, max: 150 },
  size: { min: 16, max: 48 },
  trailLifetime: { min: 10, max: 180 },
  loopSize: { min: 0.03, max: 0.2 },
  travelIntensity: { min: 0, max: 1 },
  loopSpacing: { min: 0.2, max: 1.5 },
  trailOpacity: { min: 0.1, max: 1 },
  maxQuadrantSeconds: { min: 3, max: 20 },
  loopVariation: { min: 0, max: 0.4 },
  trailWidth: { min: 0.5, max: 4 },
} as const;

export type BeeSettingKey = keyof typeof BEE_SETTING_LIMITS;
export type BeeSettings = Record<BeeSettingKey, number>;
export type BeeSettingsSnapshot = { settings: BeeSettings; revision: number };

// The existing animation's effective defaults. The engine caps variation at 0.4.
export const DEFAULT_BEE_SETTINGS: Readonly<BeeSettings> = Object.freeze({
  minSpeed: 30,
  maxSpeed: 80,
  size: 20,
  trailLifetime: 90,
  loopSize: 0.15,
  travelIntensity: 0.9,
  loopSpacing: 0.6,
  trailOpacity: 0.9,
  maxQuadrantSeconds: 7,
  loopVariation: 0.4,
  trailWidth: 2,
});

export const BEE_SETTING_KEYS = Object.keys(BEE_SETTING_LIMITS) as BeeSettingKey[];

export function parseBeeSettings(input: unknown): BeeSettings {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Bee settings must be an object');
  }
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => !Object.hasOwn(BEE_SETTING_LIMITS, key))) {
    throw new Error('Unknown bee setting');
  }
  const settings = { ...DEFAULT_BEE_SETTINGS };
  for (const key of BEE_SETTING_KEYS) {
    const value = record[key];
    const { min, max } = BEE_SETTING_LIMITS[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      throw new Error(`${key} must be between ${min} and ${max}`);
    }
    settings[key] = value;
  }
  if (!Number.isInteger(settings.size)) throw new Error('Bee size must be a whole number');
  if (settings.minSpeed > settings.maxSpeed) {
    throw new Error('Slowest speed cannot exceed fastest speed');
  }
  return settings;
}

function isReversed(key: BeeSettingKey) {
  return key === 'loopSpacing' || key === 'maxQuadrantSeconds';
}

export function beeSettingSliderLimits(key: BeeSettingKey): { min: number; max: number } {
  if (key === 'size' || key === 'trailLifetime') return BEE_SETTING_LIMITS[key];
  if (key === 'trailOpacity') {
    const { min, max } = BEE_SETTING_LIMITS[key];
    return { min: min * 100, max: max * 100 };
  }
  return { min: 0, max: 100 };
}

export function beeSettingToSlider(key: BeeSettingKey, value: number): number {
  if (key === 'size' || key === 'trailLifetime') return value;
  if (key === 'trailOpacity') return value * 100;
  const { min, max } = BEE_SETTING_LIMITS[key];
  const percentage = ((value - min) / (max - min)) * 100;
  if (isReversed(key)) return 100 - percentage;
  return percentage;
}

export function sliderToBeeSetting(key: BeeSettingKey, value: number): number {
  if (key === 'size' || key === 'trailLifetime') return Math.round(value);
  if (key === 'trailOpacity') return value / 100;
  const { min, max } = BEE_SETTING_LIMITS[key];
  const percentage = isReversed(key) ? 100 - value : value;
  return Number((min + (percentage / 100) * (max - min)).toFixed(6));
}

export function beeSettingsEqual(a: BeeSettings, b: BeeSettings): boolean {
  return BEE_SETTING_KEYS.every((key) => a[key] === b[key]);
}
