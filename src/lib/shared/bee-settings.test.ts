import { describe, expect, it } from 'vitest';

import {
  BEE_SETTING_KEYS,
  BEE_SETTING_LIMITS,
  DEFAULT_BEE_SETTINGS,
  beeSettingsEqual,
  beeSettingToSlider,
  parseBeeSettings,
  sliderToBeeSetting,
} from '@/lib/shared/bee-settings';
import { createBeeTwoFlight, getBeeTwoArea } from '@/lib/shared/bee-two-animation';

describe('bee settings', () => {
  it.each(BEE_SETTING_KEYS)('round-trips the exact default for %s', (key) => {
    const initial = DEFAULT_BEE_SETTINGS[key];
    expect(sliderToBeeSetting(key, beeSettingToSlider(key, initial))).toBe(initial);
  });

  it.each([16, 20, 48])('keeps size %s in pixels', (size) => {
    expect(beeSettingToSlider('size', size)).toBe(size);
    expect(sliderToBeeSetting('size', size)).toBe(size);
  });

  it.each(BEE_SETTING_KEYS.filter((key) => key !== 'size'))(
    'maps %s endpoints to the allowed physical bounds',
    (key) => {
      const { min, max } = BEE_SETTING_LIMITS[key];
      const reversed = key === 'loopSpacing' || key === 'maxQuadrantSeconds';
      expect(sliderToBeeSetting(key, 0)).toBe(reversed ? max : min);
      expect(sliderToBeeSetting(key, 100)).toBe(reversed ? min : max);
    },
  );

  it.each(BEE_SETTING_KEYS)('rejects invalid values for %s', (key) => {
    const { min, max } = BEE_SETTING_LIMITS[key];
    for (const value of [undefined, null, '', '20', NaN, Infinity, -Infinity, min - 1, max + 1]) {
      expect(() => parseBeeSettings({ ...DEFAULT_BEE_SETTINGS, [key]: value })).toThrow(
        /must be between/,
      );
    }
  });

  it('rejects invalid objects, unknown keys, fractional sizes, and crossed ranges', () => {
    for (const input of [null, [], 0, {}, { ...DEFAULT_BEE_SETTINGS, extra: 1 }]) {
      expect(() => parseBeeSettings(input)).toThrow(
        /Bee settings must be an object|Unknown bee setting|must be between/,
      );
    }
    expect(() => parseBeeSettings({ ...DEFAULT_BEE_SETTINGS, size: 20.5 })).toThrow(
      'Bee size must be a whole number',
    );
    expect(() => parseBeeSettings({ ...DEFAULT_BEE_SETTINGS, minSpeed: 90, maxSpeed: 80 })).toThrow(
      'Slowest speed cannot exceed fastest speed',
    );
    expect(parseBeeSettings({ ...DEFAULT_BEE_SETTINGS, minSpeed: 80 }).minSpeed).toBe(80);
  });

  it('preserves all exact saved values, detects changes, and leaves defaults immutable', () => {
    const saved = { ...DEFAULT_BEE_SETTINGS, loopSize: 0.123456789 };
    expect(parseBeeSettings(saved)).toEqual(saved);
    expect(beeSettingsEqual(saved, { ...saved })).toBe(true);
    expect(beeSettingsEqual(saved, DEFAULT_BEE_SETTINGS)).toBe(false);
    expect(Object.isFrozen(DEFAULT_BEE_SETTINGS)).toBe(true);
  });
});

function seededRandom() {
  let state = 97;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const geometryCases: {
  width: number;
  height: number;
  size: number;
  variation: number;
  intensity: number;
  loopSize: number;
}[] = [];
for (const [width, height] of [
  [390, 844],
  [1440, 900],
  [844, 390],
]) {
  for (const size of [16, 48]) {
    for (const variation of [0, 0.4]) {
      for (const intensity of [0, 1]) {
        for (const loopSize of [0.03, 0.2]) {
          geometryCases.push({ width, height, size, variation, intensity, loopSize });
        }
      }
    }
  }
}

describe('existing geometry with configurable inputs', () => {
  // Give each deterministic combination its own test budget and failure report.
  it.each(geometryCases)(
    'keeps $width × $height safe (size=$size, variation=$variation, wandering=$intensity, loops=$loopSize)',
    ({ width, height, size, variation, intensity, loopSize }) => {
      const area = getBeeTwoArea(width, height, 160, true);
      const clearance = Math.hypot(size, size) / 2 + 4;
      const flight = createBeeTwoFlight(
        area,
        {
          loopSizeRatio: loopSize,
          loopVariation: variation,
          travelIntensity: intensity,
          loopSpacingRatio: 0.2,
          maxQuadrantSeconds: 3,
          minTurnDegrees: 40,
          maxTurnDegrees: 60,
          outerPaddingRatio: -0.08,
          excludeCenter: true,
          clearance,
        },
        seededRandom(),
      );
      expect(flight).not.toBeNull();
      if (!flight) throw new Error('Expected a usable flight area');
      for (let step = 0; step < 3000; step++) {
        const point = flight.advance(6, 0.04);
        const outsideCenter =
          point.x + clearance <= width * 0.3 + 1e-6 ||
          point.x - clearance >= width * 0.7 - 1e-6 ||
          point.y + clearance <= height * 0.3 + 1e-6 ||
          point.y - clearance >= height * 0.7 - 1e-6;
        const insideBounds =
          point.x >= -0.08 * width + clearance - 1e-6 &&
          point.x <= 1.08 * width - clearance + 1e-6 &&
          point.y >= -0.08 * height + clearance - 1e-6 &&
          point.y <= 1.08 * height - clearance + 1e-6;
        if (!outsideCenter || !insideBounds) {
          throw new Error(
            `Unsafe flight: ${JSON.stringify({ point, size, variation, intensity, loopSize, width, height })}`,
          );
        }
      }
    },
  );

  it('retains the original 0.4 variation clamp', () => {
    const area = getBeeTwoArea(1440, 900, 160, true);
    const settings = {
      loopSizeRatio: 0.15,
      outerPaddingRatio: -0.08,
      travelIntensity: 0.9,
      clearance: 20,
    };
    const original = createBeeTwoFlight(area, { ...settings, loopVariation: 2.2 }, seededRandom());
    const explicit = createBeeTwoFlight(area, { ...settings, loopVariation: 0.4 }, seededRandom());
    expect(original).not.toBeNull();
    for (let step = 0; step < 300; step++) {
      expect(explicit?.advance(4, 0.05)).toEqual(original?.advance(4, 0.05));
    }
  });
});
