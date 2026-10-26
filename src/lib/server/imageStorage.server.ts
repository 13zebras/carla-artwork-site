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
    value: ReadableStream<Uint8Array>,
    options: { httpMetadata: { contentType: string }; sha256: string },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
  list(options: { prefix: string; cursor?: string }): Promise<{
    objects: StoredImageMetadata[];
    truncated: boolean;
    cursor?: string;
  }>;
};

type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif';

type ImageTransform = {
  transform(options: { width?: number; height?: number; fit: 'scale-down' }): ImageTransform;
  output(options: { format: ImageFormat; quality?: number }): Promise<{ response(): Response }>;
};

export type ImageBindings = {
  ARTWORK_IMAGES: ImageBucket;
  IMAGES: { input(stream: ReadableStream<Uint8Array>): ImageTransform };
};

function validateStoragePath(storagePath: string) {
  if (
    !/^(artworks|siteImages)\//.test(storagePath) ||
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

export async function deleteImage(storagePath: string) {
  await getWorkerBindings().ARTWORK_IMAGES.delete(validateStoragePath(storagePath));
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

function readDimension(params: URLSearchParams, name: string, maximum: number) {
  const value = params.get(name);
  if (value === null) return undefined;
  if (!/^\d+$/.test(value)) throw new Error(`Invalid ${name}`);
  const number = Number(value);
  if (number < 1 || number > maximum) throw new Error(`Invalid ${name}`);
  return number;
}

const imageFormats: Record<string, ImageFormat> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

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

/** Handles /media/* before the application's router, on any deployed hostname. */
export async function handleMediaRequest(
  request: Request,
  bindings: ImageBindings,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  const url = new URL(request.url);
  let storagePath: string;
  let width: number | undefined;
  let height: number | undefined;
  let quality: number | undefined;
  let format: ImageFormat | undefined;
  try {
    storagePath = validateStoragePath(decodeURIComponent(url.pathname.slice('/media/'.length)));
    width = readDimension(url.searchParams, 'width', 4096);
    height = readDimension(url.searchParams, 'height', 4096);
    quality = readDimension(url.searchParams, 'quality', 100);
    const requestedFormat = url.searchParams.get('format');
    if (requestedFormat !== null) {
      if (!Object.hasOwn(imageFormats, requestedFormat)) throw new Error('Invalid image format');
      format = imageFormats[requestedFormat];
      if (!format) throw new Error('Invalid image format');
    }
  } catch {
    return new Response('Invalid image request', { status: 400 });
  }

  const image = await bindings.ARTWORK_IMAGES.get(storagePath);
  if (!image) return new Response('Image not found', { status: 404 });
  const headers = new Headers({
    'Cache-Control': 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
  });
  const head = request.method === 'HEAD';
  const contentType = image.httpMetadata?.contentType?.split(';')[0];
  const inputFormat = Object.values(imageFormats).find((value) => value === contentType);
  const shouldTransform =
    width !== undefined || height !== undefined || format !== undefined || quality !== undefined;
  // Existing uploads permit 50 MB. Images accepts 20 MB; preserve larger or
  // unsupported originals instead of breaking their existing public URLs.
  if (!shouldTransform || image.size > 20_000_000 || !inputFormat) {
    return originalResponse(image, headers, head);
  }
  try {
    const output = await bindings.IMAGES.input(image.body)
      .transform({ width, height, fit: 'scale-down' })
      .output({ format: format ?? inputFormat, quality });
    const response = output.response();
    for (const [name, value] of headers) response.headers.set(name, value);
    if (head) await response.body?.cancel();
    return new Response(head ? null : response.body, response);
  } catch (error) {
    console.error('Image transformation failed; serving original', error);
    const original = await bindings.ARTWORK_IMAGES.get(storagePath);
    if (!original) return new Response('Image not found', { status: 404 });
    return originalResponse(original, headers, head);
  }
}
