import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getParagraphs(text: string) {
  let position = 0;

  return text
    .split(/\r?\n[\t ]*\r?\n+/)
    .map((value) => {
      const paragraph = value.trim();
      const id = `${position}-${paragraph.length}`;
      position += value.length;
      return { id, text: paragraph };
    })
    .filter((paragraph) => Boolean(paragraph.text));
}

export const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeArtworkStatus(value: unknown) {
  const status = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (status === '' || status === 'draft') {
    return 'draft' as const;
  }
  if (status === 'published') {
    return 'published' as const;
  }
  throw new Error('Artwork status must be draft or published');
}

type IntegerOptions = {
  errorMessage: string;
  fallback?: number;
};

export function parseInteger(
  value: unknown,
  options: IntegerOptions & { fallback: number },
): number;
export function parseInteger(value: unknown, options: IntegerOptions): number | undefined;
export function parseInteger(value: unknown, { errorMessage, fallback }: IntegerOptions) {
  if (value == null || String(value).trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(errorMessage);
  }

  return parsed;
}
