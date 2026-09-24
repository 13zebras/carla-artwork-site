import { sql } from 'kysely';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getKysely } from '@/lib/server/db.server';
import {
  getBeeSettings,
  getSiteSettings,
  saveBeeSettingsFromRequest,
  updateAboutSettings,
  updateBeeSettings,
  updateDemoMode,
} from '@/lib/server/site-settings.server';
import { DEFAULT_BEE_SETTINGS } from '@/lib/shared/bee-settings';

const { requireAdmin } = vi.hoisted(() => ({
  requireAdmin: vi.fn<() => Promise<{ user: { email: string } }>>(),
}));
vi.mock('@/lib/server/auth-session.server', () => ({ requireAdminFromRequest: requireAdmin }));

beforeEach(async () => {
  requireAdmin.mockReset().mockResolvedValue({ user: { email: 'admin@example.com' } });
  // Exercise the migration's actual SQL defaults, not just the TypeScript defaults.
  await sql`update site_settings set bee_settings = default, bee_revision = default where id = 'site'`.execute(
    getKysely(),
  );
});

describe('persisted bee settings', () => {
  it('seeds the exact current defaults and exposes only bee data', async () => {
    expect(await getBeeSettings()).toEqual({ settings: DEFAULT_BEE_SETTINGS, revision: 0 });
  });

  it('persists all controls and increments an independent revision', async () => {
    const before = await getSiteSettings();
    const settings = {
      ...DEFAULT_BEE_SETTINGS,
      size: 48,
      trailLifetime: 120,
      loopSize: 0.123456789,
    };
    const saved = await saveBeeSettingsFromRequest(settings);
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(saved).toEqual({ settings, revision: 1 });
    expect(await getBeeSettings()).toEqual(saved);
    const after = await getSiteSettings();
    expect({ ...after, bee: before.bee }).toEqual(before);
  });

  it('does not change the bee revision when About/demo settings change', async () => {
    const before = await getBeeSettings();
    await updateDemoMode(true);
    await updateAboutSettings({
      aboutText: 'Unrelated edit',
      aboutMobileImagePath: null,
      aboutDesktopImagePath: null,
      aboutImageAlt: '',
    });
    expect(await getBeeSettings()).toEqual(before);
    await updateDemoMode(false);
  });

  it('rejects unauthorized saves without modifying the database', async () => {
    requireAdmin.mockRejectedValue(new Error('Unauthorized'));
    await expect(saveBeeSettingsFromRequest({ ...DEFAULT_BEE_SETTINGS, size: 48 })).rejects.toThrow(
      'Unauthorized',
    );
    expect(await getBeeSettings()).toEqual({ settings: DEFAULT_BEE_SETTINGS, revision: 0 });
  });

  it('rejects invalid values without incrementing the revision', async () => {
    for (const settings of [
      { ...DEFAULT_BEE_SETTINGS, size: 49 },
      { ...DEFAULT_BEE_SETTINGS, size: 16.5 },
      { ...DEFAULT_BEE_SETTINGS, minSpeed: 100, maxSpeed: 50 },
    ]) {
      await expect(saveBeeSettingsFromRequest(settings)).rejects.toThrow(/must be|cannot exceed/);
    }
    expect((await getBeeSettings()).revision).toBe(0);
  });

  it('increments the revision atomically across concurrent saves', async () => {
    const results = await Promise.all([
      updateBeeSettings({ ...DEFAULT_BEE_SETTINGS, size: 16 }),
      updateBeeSettings({ ...DEFAULT_BEE_SETTINGS, size: 48 }),
    ]);
    expect(results.map(({ revision }) => revision).sort()).toEqual([1, 2]);
    expect(await getBeeSettings()).toEqual(results.find(({ revision }) => revision === 2));
  });
});
