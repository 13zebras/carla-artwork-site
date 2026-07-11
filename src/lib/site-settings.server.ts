import { sql } from 'kysely';

import { getKysely } from './db.server';

export type SiteSettings = {
  demoMode: boolean;
  updatedAt: string;
};

type SiteSettingsRow = {
  demo_mode: boolean;
  updated_at: string;
};

function toSiteSettings(row: SiteSettingsRow): SiteSettings {
  return {
    demoMode: row.demo_mode,
    updatedAt: row.updated_at,
  };
}

export async function getSiteSettings() {
  const { rows } = await sql`
    select demo_mode, updated_at
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
    returning demo_mode, updated_at
  `.execute(getKysely());

  const row = rows[0] as SiteSettingsRow | undefined;
  if (!row) {
    throw new Error('Site settings are not initialized');
  }

  return toSiteSettings(row);
}
