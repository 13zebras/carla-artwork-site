// Every resized copy the site stores. Copies are made once at upload, so these
// are the only sizes that ever cost an image transformation.
export const imageVariantWidths = [120, 350, 448, 480, 575, 700, 746, 896, 1000, 1150] as const;

export function getImageUrl(storagePath: string) {
  return `/media/${storagePath.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}`;
}

export function getImageVariantPath(storagePath: string, width: number) {
  return `variants/${storagePath.replace(/^\/+/, '')}/w${width}.webp`;
}

/** Widths stored for a source image; copies are never wider than the original. */
export function getStoredVariantWidths(sourceWidth: number) {
  return imageVariantWidths.filter((width) => width <= sourceWidth);
}

/**
 * URL of the smallest stored copy at least `width` pixels wide. Falls back to
 * the original when no stored copy is wide enough.
 */
export function buildImageUrl(imageUrl: string, width: number, sourceWidth: number) {
  // Demo placeholders and other external sources are not served by our Worker.
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  const variantWidth = imageVariantWidths.find((candidate) => candidate >= width);
  if (variantWidth === undefined || variantWidth > sourceWidth) return imageUrl;
  return `${imageUrl.replace(/^\/media\//, '/media/variants/')}/w${variantWidth}.webp`;
}

/** `srcset` entries for the stored copies from `widths` that the source can supply. */
export function buildImageSrcSet(imageUrl: string, sourceWidth: number, widths: readonly number[]) {
  const stored = widths.filter((width) => width <= sourceWidth);
  if (stored.length === 0) return `${imageUrl} ${sourceWidth}w`;
  return stored
    .map((width) => `${buildImageUrl(imageUrl, width, sourceWidth)} ${width}w`)
    .join(', ');
}
