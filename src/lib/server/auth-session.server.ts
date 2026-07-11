import { getRequestHeader } from '@tanstack/react-start/server';

import { auth } from './auth-config.server';
import { getServerEnv } from './env.server';

function getCookieHeaders(): HeadersInit {
  const cookie = getRequestHeader('cookie');
  const headers: HeadersInit = {};
  if (cookie) {
    headers.cookie = cookie;
  }
  return headers;
}

export async function getSessionFromRequest() {
  return auth.api.getSession({ headers: getCookieHeaders() });
}

export async function requireAdminFromRequest() {
  const session = await getSessionFromRequest();
  const email = session?.user?.email?.toLowerCase();

  if (email !== getServerEnv().ADMIN_EMAIL) {
    throw new Error('Unauthorized');
  }

  return session;
}
