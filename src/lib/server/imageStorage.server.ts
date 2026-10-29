import {
  getImageVariantPath,
  getStoredVariantWidths,
  imageVariantWidths,
} from '@/lib/shared/image';
import type { ImageStorageFile } from '@/lib/shared/image.types';

import { getWorkerBindings } from './runtimeContext.server';

type StoredImageMetadata = {
  key: string;
  size: number;
  uploaded: Date;
};

type StoredImage = StoredImageMetadata & {
  body: ReadableStream<Uint8Array>;
  httpEtag: string;
  httpMetadata?: { contentType?: string };
  arrayBuffer(): Promise<ArrayBuffer>;
  writeHttpMetadata(headers: Headers): void;
};

export type ImageBucket = {
  get(key: string): Promise<StoredImage | null>;
  put(
    key: string,
    value: ReadableStream<Uint8Array> | ArrayBuffer,
    options: { httpMetadata: { contentType: string }; sha256?: string },
  ): Promise<unknown>;
  delete(keys: string | string[]): Promise<void>;
  list(options: { prefix: string; cursor?: string }): Promise<{
    objects: StoredImageMetadata[];
    truncated: boolean;
    cursor?: string;
  }>;
};

type ImageTransform = {
  transform(options: { width: number; fit: 'scale-down' }): ImageTransform;
  output(options: { format: 'image/webp' }): Promise<{ response(): Response }>;
};

export type ImageBindings = {
  ARTWORK_IMAGES: ImageBucket;
  IMAGES: { input(stream: ReadableStream<Uint8Array>): ImageTransform };
};

function validateStoragePath(storagePath: string) {
  if (
    !/^(artworks|siteImages|variants\/artworks)\//.test(storagePath) ||
    storagePath.includes('\\') ||
    Array.from(storagePath).some((character) => character.charCodeAt(0) < 32) ||
    storagePath.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error('Invalid image storage path');
  }
  return storagePath;
}

export async function uploadImage({
  storagePath,
  file,
  contentType,
  checksumSha256,
}: {
  storagePath: string;
  file: File;
  contentType: string;
  checksumSha256: string;
}) {
  await getWorkerBindings().ARTWORK_IMAGES.put(validateStoragePath(storagePath), file.stream(), {
    httpMetadata: { contentType },
    sha256: checksumSha256,
  });
}

/**
 * Stores a WebP copy of an uploaded artwork at each site width. This runs once
 * per upload; visitors only ever receive stored files, never live transforms.
 */
export async function storeImageVariants(storagePath: string, sourceWidth: number) {
  const { ARTWORK_IMAGES, IMAGES } = getWorkerBindings();
  const original = await ARTWORK_IMAGES.get(validateStoragePath(storagePath));
  if (!original) throw new Error(`Image storage file not found: ${storagePath}`);
  const bytes = await original.arrayBuffer();
  for (const width of getStoredVariantWidths(sourceWidth)) {
    const output = await IMAGES.input(new Blob([bytes]).stream())
      .transform({ width, fit: 'scale-down' })
      .output({ format: 'image/webp' });
    // R2 needs a known length, so buffer each copy instead of streaming it.
    await ARTWORK_IMAGES.put(
      getImageVariantPath(storagePath, width),
      await output.response().arrayBuffer(),
      { httpMetadata: { contentType: 'image/webp' } },
    );
  }
}

export async function deleteImageVariants(storagePath: string) {
  validateStoragePath(storagePath);
  await getWorkerBindings().ARTWORK_IMAGES.delete(
    imageVariantWidths.map((width) => getImageVariantPath(storagePath, width)),
  );
}

export async function deleteImage(storagePath: string) {
  await getWorkerBindings().ARTWORK_IMAGES.delete(validateStoragePath(storagePath));
  if (storagePath.startsWith('artworks/')) await deleteImageVariants(storagePath);
}

export async function downloadImage(storagePath: string) {
  const image = await getWorkerBindings().ARTWORK_IMAGES.get(validateStoragePath(storagePath));
  if (!image) throw new Error(`Image storage file not found: ${storagePath}`);
  return {
    buffer: Buffer.from(await image.arrayBuffer()),
    contentType: image.httpMetadata?.contentType ?? null,
  };
}

export async function listImageStorageFiles(prefix = 'artworks/'): Promise<ImageStorageFile[]> {
  const normalizedPrefix = `${prefix.replace(/^\/+|\/+$/g, '')}/`;
  validateStoragePath(`${normalizedPrefix}placeholder`);
  const files: ImageStorageFile[] = [];
  let cursor: string | undefined;
  do {
    const result = await getWorkerBindings().ARTWORK_IMAGES.list({
      prefix: normalizedPrefix,
      cursor,
    });
    for (const object of result.objects) {
      files.push({
        path: object.key,
        name: object.key.split('/').at(-1) ?? object.key,
        isDirectory: false,
        sizeBytes: object.size,
        modifiedAt: object.uploaded.toISOString(),
      });
    }
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);
  return files;
}

async function originalResponse(image: StoredImage, headers: Headers, head: boolean) {
  image.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=300');
  // Never execute an unexpected storage object as same-origin HTML or SVG.
  if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(headers.get('Content-Type') ?? '')) {
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Disposition', 'attachment');
  }
  headers.set('ETag', image.httpEtag);
  headers.set('Content-Length', String(image.size));
  if (head) await image.body.cancel();
  return new Response(head ? null : image.body, { headers });
}

/** Serves stored images under /media/*. It never transforms on request. */
export async function handleMediaRequest(
  request: Request,
  bindings: ImageBindings,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  let storagePath: string;
  try {
    const pathname = new URL(request.url).pathname;
    storagePath = validateStoragePath(decodeURIComponent(pathname.slice('/media/'.length)));
  } catch {
    return new Response('Invalid image request', { status: 400 });
  }

  const image = await bindings.ARTWORK_IMAGES.get(storagePath);
  if (!image) return new Response('Image not found', { status: 404 });
  const headers = new Headers({ 'X-Content-Type-Options': 'nosniff' });
  return originalResponse(image, headers, request.method === 'HEAD');
}
