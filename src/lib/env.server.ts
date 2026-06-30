type ServerEnv = {
  DATABASE_PATH: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  ADMIN_EMAIL: string;
  RESEND_API_KEY: string;
  AUTH_EMAIL_FROM: string;
  BUNNY_STORAGE_ZONE: string;
  BUNNY_STORAGE_PASSWORD: string;
  BUNNY_STORAGE_ENDPOINT: string;
  BUNNY_CDN_BASE_URL: string;
};

let cachedEnv: ServerEnv | null = null;

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function requiredEnv(name: keyof ServerEnv): string | undefined {
  const value = process.env[name];
  if (value == null || value.trim() === '') {
    return undefined;
  }
  return value.trim();
}

function collectRequiredEnv(name: keyof ServerEnv, value: string | undefined, missing: string[]) {
  if (!value) {
    missing.push(name);
  }
  return value ?? '';
}

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const missing: string[] = [];
  const databasePath = collectRequiredEnv(
    'DATABASE_PATH',
    requiredEnv('DATABASE_PATH') ??
      (process.env.NODE_ENV === 'development' ? '.data/carla.sqlite' : undefined),
    missing,
  );
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
    DATABASE_PATH: databasePath,
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: normalizeOrigin(betterAuthUrlRaw),
    ADMIN_EMAIL: adminEmailRaw.toLowerCase(),
    RESEND_API_KEY: resendApiKey,
    AUTH_EMAIL_FROM: authEmailFrom,
    BUNNY_STORAGE_ZONE: bunnyStorageZone,
    BUNNY_STORAGE_PASSWORD: bunnyStoragePassword,
    BUNNY_STORAGE_ENDPOINT: normalizeOrigin(bunnyStorageEndpointRaw),
    BUNNY_CDN_BASE_URL: normalizeOrigin(bunnyCdnBaseUrlRaw),
  };

  return cachedEnv;
}

export type { ServerEnv };
