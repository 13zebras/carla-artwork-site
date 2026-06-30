import { createServerFn } from '@tanstack/react-start';

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { getSessionFromRequest } = await import('./auth.server');
  return getSessionFromRequest();
});

export const requireAdmin = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireAdminFromRequest } = await import('./auth.server');
  return requireAdminFromRequest();
});
