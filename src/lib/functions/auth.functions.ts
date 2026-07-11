import { createServerFn } from '@tanstack/react-start';

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { getSessionFromRequest } = await import('../server/auth-session.server');
  return getSessionFromRequest();
});

export const requireAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireAdminFromRequest } = await import('../server/auth-session.server');
  return requireAdminFromRequest();
});
