import { sql } from 'kysely';

import { getKysely } from './db.server';

export type SiteSettings = {
  demoMode: boolean;
  aboutText: string;
  aboutMobileImagePath: string | null;
  aboutDesktopImagePath: string | null;
  aboutImageAlt: string;
  updatedAt: string;
};

type SiteSettingsRow = {
  demo_mode: boolean;
  about_text: string;
  about_mobile_image_path: string | null;
  about_desktop_image_path: string | null;
  about_image_alt: string;
  updated_at: string;
};

function toSiteSettings(row: SiteSettingsRow): SiteSettings {
  return {
    demoMode: row.demo_mode,
    aboutText: row.about_text,
    aboutMobileImagePath: row.about_mobile_image_path,
    aboutDesktopImagePath: row.about_desktop_image_path,
    aboutImageAlt: row.about_image_alt,
    updatedAt: row.updated_at,
  };
}

const siteSettingsColumns = sql`
  demo_mode,
  about_text,
  about_mobile_image_path,
  about_desktop_image_path,
  about_image_alt,
  updated_at
`;

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
