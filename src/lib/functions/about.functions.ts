import { createServerFn } from '@tanstack/react-start';

export const getAboutContent = createServerFn({ method: 'GET' }).handler(async () => {
  const { getAboutContent: loadAboutContent } = await import('../server/about.server');
  return loadAboutContent();
});

export const saveAboutContent = createServerFn({ method: 'POST' })
  .validator((data) => {
    if (!(data instanceof FormData)) {
      throw new Error('Expected FormData');
    }
    return data;
  })
  .handler(async ({ data }) => {
    const { saveAboutContent: persistAboutContent } = await import('../server/about.server');
    return persistAboutContent(data);
  });
