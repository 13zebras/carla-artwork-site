import { createServerFn } from '@tanstack/react-start';

export const getRailwayEnvironmentName = createServerFn({ method: 'GET' }).handler(async () => {
  return process.env.RAILWAY_ENVIRONMENT_NAME ?? null;
});
