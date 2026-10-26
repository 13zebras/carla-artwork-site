import { createServerFn } from '@tanstack/react-start';

export const getRailwayEnvironmentName = createServerFn({ method: 'GET' }).handler(async () => {
  const { getRuntimeContext } = await import('../server/runtimeContext.server');
  return getRuntimeContext().values.APP_ENVIRONMENT ?? null;
});
