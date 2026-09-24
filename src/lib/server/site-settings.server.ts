import { sql } from 'kysely';

import { ensureSchema, getKysely, toIsoTimestamp } from '@/lib/server/db.server';
import { parseBeeSettings } from '@/lib/shared/bee-settings';
import type { BeeSettingsSnapshot } from '@/lib/shared/bee-settings';

export type SiteSettings = {
  demoMode: boolean;
  bee: BeeSettingsSnapshot;
  aboutText: string;
  aboutMobileImagePath: string | null;
  aboutDesktopImagePath: string | null;
  aboutImageAlt: string;
  updatedAt: string;
};

type SiteSettingsRow = {
  demo_mode: boolean;
  bee_settings: unknown;
  bee_revision: number;
  about_text: string;
  about_mobile_image_path: string | null;
  about_desktop_image_path: string | null;
  about_image_alt: string;
  updated_at: Date | string;
};

function toSiteSettings(row: SiteSettingsRow): SiteSettings {
  return {
    demoMode: row.demo_mode,
    bee: toBeeSnapshot(row),
    aboutText: row.about_text,
    aboutMobileImagePath: row.about_mobile_image_path,
    aboutDesktopImagePath: row.about_desktop_image_path,
    aboutImageAlt: row.about_image_alt,
    updatedAt: toIsoTimestamp(row.updated_at),
  };
}

const siteSettingsColumns = sql`
  demo_mode,
  bee_settings,
  bee_revision,
  about_text,
  about_mobile_image_path,
  about_desktop_image_path,
  about_image_alt,
  updated_at
`;

type BeeSettingsRow = { bee_settings: unknown; bee_revision: number };

function toBeeSnapshot(row: BeeSettingsRow | undefined): BeeSettingsSnapshot {
  if (!row) throw new Error('Site settings are not initialized');
  return { settings: parseBeeSettings(row.bee_settings), revision: row.bee_revision };
}

export async function getBeeSettings(): Promise<BeeSettingsSnapshot> {
  const { rows } = await sql<BeeSettingsRow>`
    select bee_settings, bee_revision from site_settings where id = 'site'
  `.execute(getKysely());
  return toBeeSnapshot(rows[0]);
}

export async function saveBeeSettingsFromRequest(input: unknown): Promise<BeeSettingsSnapshot> {
  const { requireAdminFromRequest } = await import('@/lib/server/auth-session.server');
  await requireAdminFromRequest();
  await ensureSchema();
  return updateBeeSettings(input);
}

export async function updateBeeSettings(input: unknown): Promise<BeeSettingsSnapshot> {
  const settings = parseBeeSettings(input);
  // Independent revision: bee saves must not invalidate About image URLs or drafts.
  const { rows } = await sql<BeeSettingsRow>`
    update site_settings
    set bee_settings = ${JSON.stringify(settings)}::jsonb, bee_revision = bee_revision + 1
    where id = 'site'
    returning bee_settings, bee_revision
  `.execute(getKysely());
  return toBeeSnapshot(rows[0]);
}

export async function getSiteSettings() {
  const { rows } = await sql`
    select ${siteSettingsColumns}
    from site_settings
    where id = 'site'
    limit 1
  `.execute(getKysely());

  const row = rows[0] as SiteSettingsRow | undefined;
  if (!row) {
    throw new Error('Site settings are not initialized');
  }

  return toSiteSettings(row);
}

export async function updateDemoMode(demoMode: boolean) {
  const updatedAt = new Date().toISOString();
  const { rows } = await sql`
    update site_settings
    set demo_mode = ${demoMode}, updated_at = ${updatedAt}
    where id = 'site'
    returning ${siteSettingsColumns}
  `.execute(getKysely());

  const row = rows[0] as SiteSettingsRow | undefined;
  if (!row) {
    throw new Error('Site settings are not initialized');
  }

  return toSiteSettings(row);
}

export async function updateAboutSettings(input: {
  aboutText: string;
  aboutMobileImagePath: string | null;
  aboutDesktopImagePath: string | null;
  aboutImageAlt: string;
}) {
  const updatedAt = new Date().toISOString();
  const { rows } = await sql`
    update site_settings
    set
      about_text = ${input.aboutText},
      about_mobile_image_path = ${input.aboutMobileImagePath},
      about_desktop_image_path = ${input.aboutDesktopImagePath},
      about_image_alt = ${input.aboutImageAlt},
      updated_at = ${updatedAt}
    where id = 'site'
    returning ${siteSettingsColumns}
  `.execute(getKysely());

  const row = rows[0] as SiteSettingsRow | undefined;
  if (!row) {
    throw new Error('Site settings are not initialized');
  }

  return toSiteSettings(row);
}
