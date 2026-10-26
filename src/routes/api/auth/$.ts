import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/lib/server/auth-config.server';
import { ensureSchema } from '@/lib/server/db.server';

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        await ensureSchema();
        return getAuth().handler(request);
      },
      POST: async ({ request }: { request: Request }) => {
        await ensureSchema();
        return getAuth().handler(request);
      },
    },
  },
});
