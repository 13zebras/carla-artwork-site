export function buildBunnyCdnUrl(
  cdnUrl: string,
  options?: {
    width?: number;
    height?: number;
    format?: 'webp' | 'jpeg' | 'png' | 'gif' | 'avif';
    quality?: number;
  },
) {
  const url = new URL(cdnUrl);

  if (options?.width !== undefined) {
    url.searchParams.set('width', String(options.width));
  }
  if (options?.height !== undefined) {
    url.searchParams.set('height', String(options.height));
  }
  if (options?.format !== undefined) {
    url.searchParams.set('format', options.format);
  }
  if (options?.quality !== undefined) {
    url.searchParams.set('quality', String(options.quality));
  }

  return url.toString();
}
