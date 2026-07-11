import type { BunnyStorageFile } from '../shared/bunny.types';
import { getServerEnv } from './env.server';

function getStorageUrl(storagePath: string) {
  const env = getServerEnv();
  const normalizedPath = storagePath.replace(/^\/+/, '');
  return `${env.BUNNY_STORAGE_ENDPOINT}/${env.BUNNY_STORAGE_ZONE}/${normalizedPath}`;
}

function parseListingEntry(entry: Record<string, unknown>, prefix = ''): BunnyStorageFile {
  const name = String(entry.ObjectName ?? entry.Path ?? entry.Name ?? '');
  const isDirectory = Boolean(entry.IsDirectory ?? entry.isDirectory ?? entry.Directory);
  const path = `${prefix}${name}`.replace(/\/+/g, '/');
  const sizeValue = entry.Length ?? entry.LengthBytes ?? entry.Size ?? null;
  const sizeBytes =
    typeof sizeValue === 'number'
      ? sizeValue
      : Number.isFinite(Number(sizeValue))
        ? Number(sizeValue)
        : null;
  const modifiedValue =
    entry.DateCreated ??
    entry.LastChanged ??
    entry.LastModified ??
    entry.Modified ??
    entry.ModifiedAt ??
    null;

  return {
    path: isDirectory && !path.endsWith('/') ? `${path}/` : path,
    name,
    isDirectory,
    sizeBytes,
    modifiedAt:
      typeof modifiedValue === 'string'
        ? modifiedValue
        : modifiedValue instanceof Date
          ? modifiedValue.toISOString()
          : null,
  };
}

async function readJsonList(response: Response) {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Bunny storage listing failed with ${response.status}: ${text}`);
  }

  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('Bunny storage listing returned an unexpected payload');
  }

  return parsed as Record<string, unknown>[];
}

export async function uploadToBunnyStorage({
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
  const response = await fetch(getStorageUrl(storagePath), {
    method: 'PUT',
    headers: {
      AccessKey: getServerEnv().BUNNY_STORAGE_PASSWORD,
      'Content-Type': contentType,
      Checksum: checksumSha256.toUpperCase(),
    },
    body: Buffer.from(await file.arrayBuffer()),
  });

  if (response.status !== 201) {
    throw new Error(
      `Bunny storage upload failed with ${response.status}: ${await response.text()}`,
    );
  }
}

export async function deleteFromBunnyStorage(storagePath: string) {
  const response = await fetch(getStorageUrl(storagePath), {
    method: 'DELETE',
    headers: {
      AccessKey: getServerEnv().BUNNY_STORAGE_PASSWORD,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Bunny storage delete failed with ${response.status}: ${await response.text()}`,
    );
  }
}

export async function downloadFromBunnyStorage(storagePath: string): Promise<{
  buffer: Buffer;
  contentType: string | null;
}> {
  const response = await fetch(getStorageUrl(storagePath), {
    method: 'GET',
    headers: {
      AccessKey: getServerEnv().BUNNY_STORAGE_PASSWORD,
    },
  });

  if (response.status === 404) {
    throw new Error(`Bunny storage file not found: ${storagePath}`);
  }
  if (!response.ok) {
    throw new Error(
      `Bunny storage download failed with ${response.status}: ${await response.text()}`,
    );
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type'),
  };
}

async function fetchDirectory(
  prefix: string,
  env: ReturnType<typeof getServerEnv>,
): Promise<BunnyStorageFile[]> {
  const response = await fetch(
    `${env.BUNNY_STORAGE_ENDPOINT}/${env.BUNNY_STORAGE_ZONE}/${prefix}`,
    {
      method: 'GET',
      headers: {
        AccessKey: env.BUNNY_STORAGE_PASSWORD,
      },
    },
  );

  // A category directory that has no uploads yet returns 404; treat as empty.
  if (response.status === 404) {
    return [];
  }

  const entries = await readJsonList(response);
  return entries.map((entry) => parseListingEntry(entry, prefix));
}

async function listPrefixRecursive(
  rootPrefix: string,
  env: ReturnType<typeof getServerEnv>,
): Promise<BunnyStorageFile[]> {
  const files: BunnyStorageFile[] = [];
  const queue = [rootPrefix];

  while (queue.length > 0) {
    const currentPrefix = queue.shift();
    if (!currentPrefix) {
      break;
    }
    const entries = await fetchDirectory(currentPrefix, env);
    for (const entry of entries) {
      if (entry.isDirectory) {
        queue.push(entry.path);
      } else {
        files.push(entry);
      }
    }
  }

  return files;
}

function normalizePrefix(value: string) {
  return value.replace(/^\/+/, '').replace(/([^/])$/, '$1/');
}

export async function listBunnyStorageFiles(prefix?: string): Promise<BunnyStorageFile[]> {
  const env = getServerEnv();
  const prefixes = prefix ? [normalizePrefix(prefix)] : [normalizePrefix('artworks')];

  const results = await Promise.all(
    prefixes.map((currentPrefix) => listPrefixRecursive(currentPrefix, env)),
  );
  return results.flat();
}
