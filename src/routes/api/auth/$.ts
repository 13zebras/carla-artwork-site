import { createFileRoute } from '@tanstack/react-router';

import { auth } from '@/lib/auth';
import { ensureSchema } from '@/lib/db.server';

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
