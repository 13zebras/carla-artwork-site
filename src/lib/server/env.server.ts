import { getRuntimeContext } from './runtimeContext.server';

type ServerEnv = {
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  ADMIN_EMAILS: string[];
  RESEND_API_KEY: string;
  AUTH_EMAIL_FROM: string;
  CONTACT_EMAIL_TO: string;
  TURNSTILE_SECRET_KEY: string;
};

const envKey = Symbol('server-env');

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function requiredEnv(name: string): string | undefined {
  const value = getRuntimeContext().values[name];
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
  const context = getRuntimeContext();
  const cachedEnv = context.resources.get(envKey) as ServerEnv | undefined;
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

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const env: ServerEnv = {
    DATABASE_URL: databaseUrl,
    BETTER_AUTH_SECRET: betterAuthSecret,
    BETTER_AUTH_URL: normalizeOrigin(betterAuthUrlRaw),
    ADMIN_EMAILS: parseAdminEmails(adminEmailRaw),
    RESEND_API_KEY: resendApiKey,
    AUTH_EMAIL_FROM: authEmailFrom,
    CONTACT_EMAIL_TO: contactEmailTo,
    TURNSTILE_SECRET_KEY: turnstileSecretKey,
  };

  context.resources.set(envKey, env);
  return env;
}

export type { ServerEnv };
