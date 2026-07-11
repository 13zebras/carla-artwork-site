import { createFileRoute } from '@tanstack/react-router';

import { auth } from '@/lib/server/auth-config.server';
import { ensureSchema } from '@/lib/server/db.server';

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await ensureSchema();
        return auth.handler(request);
      },
      POST: async ({ request }) => {
        await ensureSchema();
        return auth.handler(request);
      },
    },
  },
});
