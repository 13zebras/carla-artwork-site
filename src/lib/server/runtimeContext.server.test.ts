import { describe, expect, it, vi } from 'vitest';

import { getAuth } from './auth-config.server';
import { getKysely, getPool } from './db.server';
import { getServerEnv } from './env.server';
import {
  getRuntimeContext,
  getWorkerBindings,
  handleRequestInContext,
  type AppBindings,
} from './runtimeContext.server';

function createBindings(name: string): AppBindings {
  return {
    HYPERDRIVE: { connectionString: `postgres://test@localhost/${name}` },
    BETTER_AUTH_SECRET: 'test-only-secret-with-at-least-thirty-two-characters',
    BETTER_AUTH_URL: `https://${name}.example.com/`,
    ADMIN_EMAIL: `${name}@example.com`,
    RESEND_API_KEY: 're_test_dummy',
    AUTH_EMAIL_FROM: 'admin@example.com',
    CONTACT_EMAIL_TO: 'contact@example.com',
    TURNSTILE_SECRET_KEY: 'test-only-turnstile-key',
    ARTWORK_IMAGES: {
      get: async () => null,
      put: async () => undefined,
      delete: async () => {},
      list: async () => ({ objects: [], truncated: false }),
    },
    IMAGES: {
      input() {
        throw new Error('Image transformations are not used by these tests');
      },
    },
  };
}

const request = () => new Request('https://site.example.com/');

describe('Worker request resources', () => {
  it('isolates overlapping requests while reusing env, database and auth within each request', async () => {
    const observed: Array<{
      env: ReturnType<typeof getServerEnv>;
      database: ReturnType<typeof getKysely>;
      auth: ReturnType<typeof getAuth>;
      pool: ReturnType<typeof getPool>;
    }> = [];

    const responses = await Promise.all(
      ['first', 'second'].map((name) => {
        const bindings = createBindings(name);
        return handleRequestInContext(request(), bindings, async () => {
          const env = getServerEnv();
          const database = getKysely();
          const auth = getAuth();
          const pool = getPool();
          observed.push({ env, database, auth, pool });
          await new Promise((resolve) => setTimeout(resolve, 0));
          expect(getWorkerBindings()).toBe(bindings);
          expect(getServerEnv()).toBe(env);
          expect(getKysely()).toBe(database);
          expect(getAuth()).toBe(auth);
          expect(env.DATABASE_URL).toBe(bindings.HYPERDRIVE.connectionString);
          expect(env.BETTER_AUTH_URL).toBe(`https://${name}.example.com`);
          expect(env.ADMIN_EMAILS).toEqual([`${name}@example.com`]);
          return new Response(name);
        });
      }),
    );

    expect(observed[0]?.env).not.toBe(observed[1]?.env);
    expect(observed[0]?.database).not.toBe(observed[1]?.database);
    expect(observed[0]?.auth).not.toBe(observed[1]?.auth);
    await Promise.all(responses.map((response) => response.text()));
    expect(observed.every(({ pool }) => pool.ended)).toBe(true);
  });

  it('keeps resources until the streamed body completes and preserves response headers', async () => {
    const close = vi.fn<() => Promise<void>>(async () => {});
    let source!: ReadableStreamDefaultController<Uint8Array>;
    const response = await handleRequestInContext(request(), createBindings('stream'), () => {
      getRuntimeContext().cleanups.add(close);
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            source = controller;
          },
        }),
        {
          status: 201,
          headers: {
            'set-cookie': 'session=test; HttpOnly',
            'x-test': 'preserved',
            'Cache-Control': 'private, max-age=10',
          },
        },
      );
    });
    expect(close).not.toHaveBeenCalled();
    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toBe('session=test; HttpOnly');
    expect(response.headers.get('x-test')).toBe('preserved');
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=10');
    source.enqueue(new TextEncoder().encode('streamed'));
    source.close();
    expect(await response.text()).toBe('streamed');
    expect(close).toHaveBeenCalledOnce();
  });

  it('cancels the source and closes resources when the response is cancelled', async () => {
    const close = vi.fn<() => Promise<void>>(async () => {});
    const cancel = vi.fn<(reason: unknown) => void>();
    const response = await handleRequestInContext(request(), createBindings('cancel'), () => {
      getRuntimeContext().cleanups.add(close);
      return new Response(new ReadableStream({ cancel }));
    });
    await response.body?.cancel('client disconnected');
    expect(cancel).toHaveBeenCalledWith('client disconnected');
    expect(close).toHaveBeenCalledOnce();
  });

  it('cleans up after a stream error and propagates the original error', async () => {
    const close = vi.fn<() => Promise<void>>(async () => {});
    const failure = new Error('stream failed');
    let source!: ReadableStreamDefaultController<Uint8Array>;
    const response = await handleRequestInContext(request(), createBindings('error'), () => {
      getRuntimeContext().cleanups.add(close);
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            source = controller;
          },
        }),
      );
    });
    source.error(failure);
    await expect(response.text()).rejects.toBe(failure);
    expect(close).toHaveBeenCalledOnce();
  });

  it('cleans up handler failures and responses without bodies', async () => {
    const close = vi.fn<() => Promise<void>>(async () => {});
    const failure = new Error('handler failed');
    await expect(
      handleRequestInContext(request(), createBindings('handler-error'), () => {
        getRuntimeContext().cleanups.add(close);
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(close).toHaveBeenCalledOnce();

    const closeEmpty = vi.fn<() => Promise<void>>(async () => {});
    const response = await handleRequestInContext(request(), createBindings('empty'), () => {
      getRuntimeContext().cleanups.add(closeEmpty);
      return new Response(null, { status: 204 });
    });
    expect(response.status).toBe(204);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(closeEmpty).toHaveBeenCalledOnce();
  });

  it('cleans up and cancels a pending body when the request aborts', async () => {
    const abort = new AbortController();
    const close = vi.fn<() => Promise<void>>(async () => {});
    const cancel = vi.fn<(reason: unknown) => void>();
    const response = await handleRequestInContext(
      new Request('https://site.example.com/', { signal: abort.signal }),
      createBindings('abort'),
      () => {
        getRuntimeContext().cleanups.add(close);
        return new Response(new ReadableStream({ cancel }));
      },
    );
    abort.abort('client disconnected');
    await response.text();
    expect(cancel).toHaveBeenCalledWith('client disconnected');
    expect(close).toHaveBeenCalledOnce();
  });
});
