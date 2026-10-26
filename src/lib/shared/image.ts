export type ImageOptions = {
  width?: number;
  height?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  quality?: number;
};

export function getImageUrl(storagePath: string) {
  return `/media/${storagePath.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}`;
}

export function buildImageUrl(imageUrl: string, options?: ImageOptions) {
  // Demo placeholders and other external sources are not served by our Worker.
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const url = new URL(imageUrl, 'https://images.invalid');
  for (const [name, value] of Object.entries(options ?? {})) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }
  return `${url.pathname}${url.search}`;
}
