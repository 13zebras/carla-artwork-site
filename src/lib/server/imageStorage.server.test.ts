import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildImageSrcSet, buildImageUrl, getImageUrl } from '@/lib/shared/image';

import {
  deleteImage,
  downloadImage,
  handleMediaRequest,
  listImageStorageFiles,
  storeImageVariants,
  uploadImage,
} from './imageStorage.server';
import type { ImageBindings, ImageBucket } from './imageStorage.server';

const { getWorkerBindings } = vi.hoisted(() => ({
  getWorkerBindings: vi.fn<() => ImageBindings>(),
}));
vi.mock('./runtimeContext.server', () => ({ getWorkerBindings }));

function createImage(contentType = 'image/jpeg', size = 8) {
  return {
    key: 'artworks/image.jpg',
    size,
    uploaded: new Date('2026-01-01T00:00:00Z'),
    httpEtag: '"image-etag"',
    httpMetadata: { contentType },
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('original'));
        controller.close();
      },
    }),
    arrayBuffer: () => new Response('original').arrayBuffer(),
    writeHttpMetadata: (headers: Headers) => headers.set('Content-Type', contentType),
  };
}

function createBindings() {
  const bucket = {
    get: vi.fn<ImageBucket['get']>().mockImplementation(async () => createImage()),
    put: vi.fn<ImageBucket['put']>().mockResolvedValue(undefined),
    delete: vi.fn<ImageBucket['delete']>().mockResolvedValue(undefined),
    list: vi.fn<ImageBucket['list']>().mockResolvedValue({ objects: [], truncated: false }),
  };
  const output = vi.fn<ReturnType<ImageBindings['IMAGES']['input']>['output']>().mockResolvedValue({
    response: () => new Response('optimized', { headers: { 'Content-Type': 'image/webp' } }),
  });
  const transform = vi.fn<ReturnType<ImageBindings['IMAGES']['input']>['transform']>();
  transform.mockReturnValue({ transform, output });
  const input = vi.fn<ImageBindings['IMAGES']['input']>().mockReturnValue({ transform, output });
  const bindings = { ARTWORK_IMAGES: bucket, IMAGES: { input } } satisfies ImageBindings;
  getWorkerBindings.mockReturnValue(bindings);
  return { bindings, bucket, input, transform, output };
}

beforeEach(() => vi.clearAllMocks());

describe('same-origin image URLs', () => {
  it('encodes each storage path segment', () => {
    expect(getImageUrl('artworks/blue bird.jpg')).toBe('/media/artworks/blue%20bird.jpg');
  });

  it('picks the smallest stored copy that covers the requested width', () => {
    const url = '/media/artworks/blue%20bird.jpg';
    expect(buildImageUrl(url, 100, 2000)).toBe(
      '/media/variants/artworks/blue%20bird.jpg/w120.webp',
    );
    expect(buildImageUrl(url, 1000, 2000)).toBe(
      '/media/variants/artworks/blue%20bird.jpg/w1000.webp',
    );
    expect(buildImageUrl(url, 1001, 2000)).toBe(
      '/media/variants/artworks/blue%20bird.jpg/w1150.webp',
    );
  });

  it('falls back to the original when no stored copy is wide enough', () => {
    const url = '/media/artworks/small.jpg';
    expect(buildImageUrl(url, 1200, 2000)).toBe(url);
    expect(buildImageUrl(url, 400, 420)).toBe(url);
    expect(buildImageUrl('https://picsum.photos/512/640', 300, 512)).toBe(
      'https://picsum.photos/512/640',
    );
  });

  it('lists only stored copies the source is wide enough to have', () => {
    expect(buildImageSrcSet('/media/artworks/a.jpg', 600, [350, 575, 700])).toBe(
      '/media/variants/artworks/a.jpg/w350.webp 350w, /media/variants/artworks/a.jpg/w575.webp 575w',
    );
    expect(buildImageSrcSet('/media/artworks/a.jpg', 300, [350, 575])).toBe(
      '/media/artworks/a.jpg 300w',
    );
  });
});

describe('R2 image storage', () => {
  it('streams uploads with content type and checksum, downloads bytes, and deletes by key', async () => {
    const { bucket } = createBindings();
    await uploadImage({
      storagePath: 'artworks/image.jpg',
      file: new File(['original'], 'image.jpg', { type: 'image/jpeg' }),
      contentType: 'image/jpeg',
      checksumSha256: 'ABC123',
    });
    const [key, body, options] = bucket.put.mock.calls[0];
    expect(key).toBe('artworks/image.jpg');
    expect(await new Response(body).text()).toBe('original');
    expect(options).toEqual({ httpMetadata: { contentType: 'image/jpeg' }, sha256: 'ABC123' });
    const downloaded = await downloadImage(key);
    expect(downloaded.buffer.toString()).toBe('original');
    expect(downloaded.contentType).toBe('image/jpeg');
    await deleteImage(key);
    expect(bucket.delete).toHaveBeenCalledWith(key);
    expect(bucket.delete).toHaveBeenCalledWith(
      expect.arrayContaining([
        'variants/artworks/image.jpg/w120.webp',
        'variants/artworks/image.jpg/w1150.webp',
      ]),
    );
  });

  it('does not look for stored copies of site images', async () => {
    const { bucket } = createBindings();
    await deleteImage('siteImages/about.jpg');
    expect(bucket.delete.mock.calls).toEqual([['siteImages/about.jpg']]);
  });

  it('stores one WebP copy per site width no wider than the original', async () => {
    const { bucket, transform, output } = createBindings();
    await storeImageVariants('artworks/image.jpg', 600);
    expect(transform.mock.calls.map(([options]) => options.width)).toEqual([
      120, 350, 448, 480, 575,
    ]);
    expect(output).toHaveBeenCalledWith({ format: 'image/webp', quality: 85 });
    expect(bucket.put.mock.calls.map(([key]) => key)).toEqual([
      'variants/artworks/image.jpg/w120.webp',
      'variants/artworks/image.jpg/w350.webp',
      'variants/artworks/image.jpg/w448.webp',
      'variants/artworks/image.jpg/w480.webp',
      'variants/artworks/image.jpg/w575.webp',
    ]);
    const [, body, options] = bucket.put.mock.calls[0];
    expect(new TextDecoder().decode(body as ArrayBuffer)).toBe('optimized');
    expect(options).toEqual({ httpMetadata: { contentType: 'image/webp' } });
  });

  it('fails when the original is missing', async () => {
    const { bucket, input } = createBindings();
    bucket.get.mockResolvedValueOnce(null);
    await expect(storeImageVariants('artworks/missing.jpg', 2000)).rejects.toThrow(
      'Image storage file not found',
    );
    expect(input).not.toHaveBeenCalled();
  });

  it('follows R2 pagination and maps object metadata for admin reconciliation', async () => {
    const { bucket } = createBindings();
    const first = createImage();
    bucket.list.mockResolvedValueOnce({ objects: [first], truncated: true, cursor: 'next' });
    bucket.list.mockResolvedValueOnce({
      objects: [{ ...first, key: 'artworks/nested/second.png' }],
      truncated: false,
    });
    expect(await listImageStorageFiles()).toEqual([
      {
        path: first.key,
        name: 'image.jpg',
        isDirectory: false,
        sizeBytes: 8,
        modifiedAt: first.uploaded.toISOString(),
      },
      {
        path: 'artworks/nested/second.png',
        name: 'second.png',
        isDirectory: false,
        sizeBytes: 8,
        modifiedAt: first.uploaded.toISOString(),
      },
    ]);
    expect(bucket.list.mock.calls).toEqual([
      [{ prefix: 'artworks/', cursor: undefined }],
      [{ prefix: 'artworks/', cursor: 'next' }],
    ]);
  });

  it('rejects paths outside image prefixes before accessing the bucket', async () => {
    const { bucket } = createBindings();
    await expect(deleteImage('secrets/config.txt')).rejects.toThrow('Invalid image storage path');
    await expect(downloadImage('artworks/../config.txt')).rejects.toThrow(
      'Invalid image storage path',
    );
    expect(bucket.delete).not.toHaveBeenCalled();
    expect(bucket.get).not.toHaveBeenCalled();
  });
});

describe('Worker media responses', () => {
  it('serves original bytes and HEAD metadata on workers.dev without a public bucket', async () => {
    const { bindings, input } = createBindings();
    const url = 'https://carla-staging.example.workers.dev/media/artworks/image.jpg';
    const response = await handleMediaRequest(new Request(url), bindings);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    expect(response.headers.get('ETag')).toBe('"image-etag"');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    expect(await response.text()).toBe('original');
    const head = await handleMediaRequest(new Request(url, { method: 'HEAD' }), bindings);
    expect(head.headers.get('Content-Length')).toBe('8');
    expect(await head.text()).toBe('');
    expect(input).not.toHaveBeenCalled();
  });

  it('serves stored copies and never transforms on request', async () => {
    const { bindings, bucket, input } = createBindings();
    bucket.get.mockResolvedValueOnce(createImage('image/webp'));
    const response = await handleMediaRequest(
      new Request('https://example.com/media/variants/artworks/image.jpg/w480.webp?width=4000'),
      bindings,
    );
    expect(bucket.get).toHaveBeenCalledWith('variants/artworks/image.jpg/w480.webp');
    expect(response.headers.get('Content-Type')).toBe('image/webp');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(input).not.toHaveBeenCalled();
  });

  it('serves unsupported input as an inert download instead of executable same-origin content', async () => {
    const { bindings, bucket, input } = createBindings();
    for (const contentType of ['text/html', 'image/svg+xml']) {
      bucket.get.mockResolvedValueOnce(createImage(contentType));
      const response = await handleMediaRequest(
        new Request('https://example.com/media/siteImages/unexpected.svg?width=480'),
        bindings,
      );
      expect(response.headers.get('Content-Type')).toBe('application/octet-stream');
      expect(response.headers.get('Content-Disposition')).toBe('attachment');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(await response.text()).toBe('original');
    }
    expect(input).not.toHaveBeenCalled();
  });

  it('returns 404 for missing keys and rejects invalid requests before reading storage', async () => {
    const { bindings, bucket } = createBindings();
    const base = 'https://example.com/media/';
    for (const suffix of [
      'secrets/config.txt',
      'variants/siteImages/about.jpg/w480.webp',
      'artworks/%2e%2e%2fconfig.txt',
    ]) {
      const response = await handleMediaRequest(new Request(base + suffix), bindings);
      expect(response.status).toBe(400);
    }
    const post = await handleMediaRequest(
      new Request(base + 'artworks/image.jpg', { method: 'POST' }),
      bindings,
    );
    expect(post.status).toBe(405);
    expect(post.headers.get('Allow')).toBe('GET, HEAD');
    expect(bucket.get).not.toHaveBeenCalled();
    bucket.get.mockResolvedValueOnce(null);
    const missing = await handleMediaRequest(new Request(base + 'artworks/missing.jpg'), bindings);
    expect(missing.status).toBe(404);
  });
});
