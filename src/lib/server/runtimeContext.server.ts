import { AsyncLocalStorage } from 'node:async_hooks';

import type { ImageBindings } from './imageStorage.server';

export type AppBindings = ImageBindings & {
  HYPERDRIVE: { connectionString: string };
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  ADMIN_EMAIL: string;
  RESEND_API_KEY: string;
  AUTH_EMAIL_FROM: string;
  CONTACT_EMAIL_TO: string;
  TURNSTILE_SECRET_KEY: string;
  APP_ENVIRONMENT?: string;
};

type RuntimeContext = {
  bindings?: AppBindings;
  values: Record<string, string | undefined>;
  resources: Map<symbol, unknown>;
  cleanups: Set<() => Promise<void>>;
  cleanupPromise?: Promise<void>;
};

const storage = new AsyncLocalStorage<RuntimeContext>();
let nodeTestContext: RuntimeContext | undefined;

function createContext(values: RuntimeContext['values'], bindings?: AppBindings): RuntimeContext {
  return { values, bindings, resources: new Map(), cleanups: new Set() };
}

// Only the Node Vitest setup opts into this fallback. Worker requests always use
// their own context and never read process.env or a shared database connection.
export function initializeNodeTestContext(values: RuntimeContext['values']) {
  if (process.env.VITEST !== 'true') {
    throw new Error('The Node test context is only available in Vitest');
  }
  nodeTestContext = createContext(values);
}

export function getRuntimeContext(): RuntimeContext {
  const context = storage.getStore() ?? nodeTestContext;
  if (!context) {
    throw new Error('Server resources must be accessed inside a request context');
  }
  if (context.cleanupPromise) {
    throw new Error('The request context has already closed');
  }
  return context;
}

export function getWorkerBindings(): AppBindings {
  const bindings = getRuntimeContext().bindings;
  if (!bindings) {
    throw new Error('Cloudflare bindings are unavailable outside a Worker request');
  }
  return bindings;
}

export function runWithRequestContext<T>(bindings: AppBindings, callback: () => T): T {
  const values = {
    DATABASE_URL: bindings.HYPERDRIVE.connectionString,
    BETTER_AUTH_SECRET: bindings.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: bindings.BETTER_AUTH_URL,
    ADMIN_EMAIL: bindings.ADMIN_EMAIL,
    RESEND_API_KEY: bindings.RESEND_API_KEY,
    AUTH_EMAIL_FROM: bindings.AUTH_EMAIL_FROM,
    CONTACT_EMAIL_TO: bindings.CONTACT_EMAIL_TO,
    TURNSTILE_SECRET_KEY: bindings.TURNSTILE_SECRET_KEY,
    APP_ENVIRONMENT: bindings.APP_ENVIRONMENT,
  };
  return storage.run(createContext(values, bindings), callback);
}

async function cleanup(context: RuntimeContext): Promise<void> {
  context.cleanupPromise ??= (async () => {
    const results = await Promise.allSettled([...context.cleanups].map((close) => close()));
    context.resources.clear();
    context.cleanups.clear();
    if (results.some((result) => result.status === 'rejected')) {
      console.error('Failed to close request resources');
    }
  })();
  await context.cleanupPromise;
}

async function bindResponse(
  response: Response,
  request: Request,
  context: RuntimeContext,
): Promise<Response> {
  const headers = new Headers(response.headers);
  if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store');

  if (!response.body) {
    await cleanup(context);
    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const reader = response.body.getReader();
  let finished = false;
  async function finish() {
    if (!finished) {
      finished = true;
      request.signal.removeEventListener('abort', onAbort);
    }
    await cleanup(context);
  }
  function onAbort() {
    void storage
      .run(context, async () => {
        try {
          await reader.cancel(request.signal.reason);
        } finally {
          await finish();
        }
      })
      .catch(() => {});
  }

  if (request.signal.aborted) {
    try {
      await reader.cancel(request.signal.reason);
    } finally {
      await finish();
    }
    throw request.signal.reason;
  }
  request.signal.addEventListener('abort', onAbort, { once: true });

  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      return storage.run(context, async () => {
        try {
          const chunk = await reader.read();
          if (chunk.done) {
            await finish();
            controller.close();
            return;
          }
          controller.enqueue(chunk.value);
        } catch (error) {
          await finish();
          controller.error(error);
        }
      });
    },
    cancel(reason) {
      return storage.run(context, async () => {
        try {
          await reader.cancel(reason);
        } finally {
          await finish();
        }
      });
    },
  });
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function handleRequestInContext(
  request: Request,
  bindings: AppBindings,
  handler: () => Promise<Response> | Response,
): Promise<Response> {
  return runWithRequestContext(bindings, async () => {
    const context = getRuntimeContext();
    try {
      request.signal.throwIfAborted();
      return await bindResponse(await handler(), request, context);
    } catch (error) {
      await cleanup(context);
      throw error;
    }
  });
}
