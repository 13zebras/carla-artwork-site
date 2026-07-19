type ServerEnv = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  ADMIN_EMAILS: string[];
  RESEND_API_KEY: string;
  AUTH_EMAIL_FROM: string;
  CONTACT_EMAIL_TO: string;
  TURNSTILE_SECRET_KEY: string;
  BUNNY_STORAGE_ZONE: string;
  BUNNY_STORAGE_PASSWORD: string;
  BUNNY_STORAGE_ENDPOINT: string;
  BUNNY_CDN_BASE_URL: string;
};

let cachedEnv: ServerEnv | null = null;

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function requiredEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value == null || value.trim() === '') {
    return undefined;
  }
  return value.trim();
}

function collectRequiredEnv(name: string, value: string | undefined, missing: string[]) {
  if (!value) {
    missing.push(name);
  }
  return value ?? '';
}

function parseAdminEmails(value: string): string[] {
  return value
    .toLowerCase()
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const missing: string[] = [];
  const databaseUrl = collectRequiredEnv('DATABASE_URL', requiredEnv('DATABASE_URL'), missing);
  const betterAuthSecret = collectRequiredEnv(
    'BETTER_AUTH_SECRET',
    requiredEnv('BETTER_AUTH_SECRET'),
    missing,
  );
  const betterAuthUrlRaw = collectRequiredEnv(
    'BETTER_AUTH_URL',
    requiredEnv('BETTER_AUTH_URL'),
    missing,
  );
  const adminEmailRaw = collectRequiredEnv('ADMIN_EMAIL', requiredEnv('ADMIN_EMAIL'), missing);
  const resendApiKey = collectRequiredEnv('RESEND_API_KEY', requiredEnv('RESEND_API_KEY'), missing);
  const authEmailFrom = collectRequiredEnv(
    'AUTH_EMAIL_FROM',
    requiredEnv('AUTH_EMAIL_FROM'),
    missing,
  );
  const contactEmailTo = collectRequiredEnv(
    'CONTACT_EMAIL_TO',
    requiredEnv('CONTACT_EMAIL_TO'),
    missing,
  );
  const turnstileSecretKey = collectRequiredEnv(
    'TURNSTILE_SECRET_KEY',
    requiredEnv('TURNSTILE_SECRET_KEY'),
    missing,
  );
  const bunnyStorageZone = collectRequiredEnv(
    'BUNNY_STORAGE_ZONE',
    requiredEnv('BUNNY_STORAGE_ZONE'),
    missing,
  );
  const bunnyStoragePassword = collectRequiredEnv(
    'BUNNY_STORAGE_PASSWORD',
    requiredEnv('BUNNY_STORAGE_PASSWORD'),
    missing,
  );
  const bunnyStorageEndpointRaw = collectRequiredEnv(
    'BUNNY_STORAGE_ENDPOINT',
    requiredEnv('BUNNY_STORAGE_ENDPOINT'),
    missing,
  );
  const bunnyCdnBaseUrlRaw = collectRequiredEnv(
    'BUNNY_CDN_BASE_URL',
    requiredEnv('BUNNY_CDN_BASE_URL'),
    missing,
  );

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  cachedEnv = {
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: normalizeOrigin(betterAuthUrlRaw),
    ADMIN_EMAILS: parseAdminEmails(adminEmailRaw),
    RESEND_API_KEY: resendApiKey,
    AUTH_EMAIL_FROM: authEmailFrom,
    CONTACT_EMAIL_TO: contactEmailTo,
    TURNSTILE_SECRET_KEY: turnstileSecretKey,
    BUNNY_STORAGE_ZONE: bunnyStorageZone,
    BUNNY_STORAGE_PASSWORD: bunnyStoragePassword,
    BUNNY_STORAGE_ENDPOINT: normalizeOrigin(bunnyStorageEndpointRaw),
    BUNNY_CDN_BASE_URL: normalizeOrigin(bunnyCdnBaseUrlRaw),
  };

  return cachedEnv;
}

export type { ServerEnv };
